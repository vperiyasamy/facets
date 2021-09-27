/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview A SpriteMesh is a THREE.js Mesh that handles the creation and
 * properties of a collection of Sprites.
 *
 * Because a SpriteMesh is meant to be rendered using a THREE.js WebGLRenderer
 * and has a custom SpriteMaterial, the details of this implementation are very
 * vertex-centric. The downside of this is that data ends up being repeated, but
 * the upside is that the material's vertex shader can perform many steps in
 * parallel on the GPU.
 *
 * Animation is implemented in the vertex shader of the SpriteMaterial through
 * attributes specified in the mesh's BufferGeometry. The geometry's position
 * attribute contains vertex positions at the end of a time range, and the
 * basePosition attribute contains the vertex positions at the beginning
 * of the time range. This way, any other logic that looks at geometry positions
 * (like ray casting) will do so using the end-of-animation positions.
 */

import {SpriteAtlas, SpriteImageData} from './sprite-atlas';

import {SpriteMaterial} from './sprite-material';

export {SpriteImageData};

declare var THREE: any;

/**
 * The Sprite class acts as an object-oriented interface for interacting with
 * the underlying properties managed by the SpriteMesh.
 *
 * In order to perform animation in the shaders of the SpriteMaterial, each
 * Sprite has two states: the current state, and the starting (base) state.
 * During rendering, each property of the Sprite is interpolated between these
 * states using an easing function according to the current time.
 *
 * For example, say a sprite is moving from position (0, 0, 0) to position
 * (1, 1, 1) from time 0 to time 10. At time 5, the sprite's effective position
 * will be half way between the starting base position and the current position
 * at (.5, .5, .5).
 *
 * Although you can directly manipulate both the base and current states of a
 * sprite, it's best to use the rebase() method, which will interpolate
 * attribute properties according to the SpriteMaterial's easing.
 *
 * Say you wanted to take a brand new Sprite and move it over the next 500 ms
 * from x=0 to x=900. In that case, here's what you'd want to do:
 *
 *      // Take note of the current time and create the sprite.
 *      const now = Date.now();
 *      const sprite = spriteMesh.createSprite();
 *
 *      // Initalize property to interpolate and specify timestamp.
 *      sprite.x = 0;
 *      sprite.timestamp = now;
 *
 *      // Rebase the sprite based on the current time.
 *      sprite.rebase(now);
 *
 *      // Overwrite the property to interpolate and update the timestamp.
 *      sprite.x = 900;
 *      sprite.timestamp = now + 500;
 *
 * When the SpriteMaterial's shaders are invoked to draw the sprite at any time
 * during the next 500 ms, its x position will be interpolated between 0 and
 * 900. After that, it'll just be 900.
 *
 * The benefit to this approach is that we can interrupt the animation mid-way
 * through and specify a new current value. For example, say we suddenly want
 * to put the sprite back at x=0 (over the next 500 ms). Here are the commands
 * to make it so:
 *
 *      // Take note of the current time and rebase the sprite.
 *      const now = Date.now();
 *      sprite.rebase(now);
 *
 *      // Overwrite the property to interpolate and update the timestamp.
 *      sprite.x = 0;
 *      sprite.timestamp = now + 500;
 *
 * This works no matter how much time has passed---whether the animation is
 * ongoing or not.
 *
 * Also note that since each sprite has its own pair of starting and current
 * timestamps, each sprite can independently animate over a different period of
 * time if desired. By staggering the timestamps slightly from one sprite to the
 * next, you can produce a wave effect, rather than having them all move in
 * unison (if desired).
 */
export class Sprite {
  /**
   * The SpriteMesh to which this Sprite is attached.
   */
  private _spriteMesh: SpriteMesh;

  /**
   * The index of this sprite in its SpriteMesh.
   */
  private _spriteIndex: number;

  /**
   * A Sprite is bound to a particular SpriteMesh at a particular index.
   */
  constructor(spriteMesh: SpriteMesh, spriteIndex: number) {
    this._spriteMesh = spriteMesh;
    this._spriteIndex = spriteIndex;
  }

  public get spriteMesh(): SpriteMesh {
    return this._spriteMesh;
  }

  public get spriteIndex(): number {
    return this._spriteIndex;
  }

  public get x(): number {
    return this._spriteMesh.getX(this._spriteIndex);
  }

  public set x(x: number) {
    this._spriteMesh.setX(this._spriteIndex, x);
  }

  public get y(): number {
    return this._spriteMesh.getY(this._spriteIndex);
  }

  public set y(y: number) {
    this._spriteMesh.setY(this._spriteIndex, y);
  }

  public get z(): number {
    return this._spriteMesh.getZ(this._spriteIndex);
  }

  public set z(z: number) {
    this._spriteMesh.setZ(this._spriteIndex, z);
  }

  public get r(): number {
    return this._spriteMesh.getR(this._spriteIndex);
  }

  public set r(r: number) {
    this._spriteMesh.setR(this._spriteIndex, r);
  }

  public get g(): number {
    return this._spriteMesh.getG(this._spriteIndex);
  }

  public set g(g: number) {
    this._spriteMesh.setG(this._spriteIndex, g);
  }

  public get b(): number {
    return this._spriteMesh.getB(this._spriteIndex);
  }

  public set b(b: number) {
    this._spriteMesh.setB(this._spriteIndex, b);
  }

  public get a(): number {
    return this._spriteMesh.getA(this._spriteIndex);
  }

  public set a(a: number) {
    this._spriteMesh.setA(this._spriteIndex, a);
  }

  public get opacity(): number {
    return this._spriteMesh.getOpacity(this._spriteIndex);
  }

  public set opacity(opacity: number) {
    this._spriteMesh.setOpacity(this._spriteIndex, opacity);
  }

  public get timestamp(): number {
    return this._spriteMesh.getTimestamp(this._spriteIndex);
  }

  public set timestamp(timestamp: number) {
    this._spriteMesh.setTimestamp(this._spriteIndex, timestamp);
  }

  public get baseX(): number {
    return this._spriteMesh.getBaseX(this._spriteIndex);
  }

  public set baseX(baseX: number) {
    this._spriteMesh.setBaseX(this._spriteIndex, baseX);
  }

  public get baseY(): number {
    return this._spriteMesh.getBaseY(this._spriteIndex);
  }

  public set baseY(baseY: number) {
    this._spriteMesh.setBaseY(this._spriteIndex, baseY);
  }

  public get baseZ(): number {
    return this._spriteMesh.getBaseZ(this._spriteIndex);
  }

  public set baseZ(baseZ: number) {
    this._spriteMesh.setBaseZ(this._spriteIndex, baseZ);
  }

  public get baseR(): number {
    return this._spriteMesh.getBaseR(this._spriteIndex);
  }

  public set baseR(baseR: number) {
    this._spriteMesh.setBaseR(this._spriteIndex, baseR);
  }

  public get baseG(): number {
    return this._spriteMesh.getBaseG(this._spriteIndex);
  }

  public set baseG(baseG: number) {
    this._spriteMesh.setBaseG(this._spriteIndex, baseG);
  }

  public get baseB(): number {
    return this._spriteMesh.getBaseB(this._spriteIndex);
  }

  public set baseB(baseB: number) {
    this._spriteMesh.setBaseB(this._spriteIndex, baseB);
  }

  public get baseA(): number {
    return this._spriteMesh.getBaseA(this._spriteIndex);
  }

  public set baseA(baseA: number) {
    this._spriteMesh.setBaseA(this._spriteIndex, baseA);
  }

  public get baseOpacity(): number {
    return this._spriteMesh.getBaseOpacity(this._spriteIndex);
  }

  public set baseOpacity(baseOpacity: number) {
    this._spriteMesh.setBaseOpacity(this._spriteIndex, baseOpacity);
  }

  public get baseTimestamp(): number {
    return this._spriteMesh.getBaseTimestamp(this._spriteIndex);
  }

  public set baseTimestamp(baseTimestamp: number) {
    this._spriteMesh.setBaseTimestamp(this._spriteIndex, baseTimestamp);
  }

  public get textureIndex(): number {
    return this._spriteMesh.getTextureIndex(this._spriteIndex);
  }

  public set textureIndex(textureIndex: number) {
    this._spriteMesh.setTextureIndex(this._spriteIndex, textureIndex);
  }

  public get baseTextureIndex(): number {
    return this._spriteMesh.getBaseTextureIndex(this._spriteIndex);
  }

  public set baseTextureIndex(baseTextureIndex: number) {
    this._spriteMesh.setBaseTextureIndex(this._spriteIndex, baseTextureIndex);
  }

  public get textureTimestamp(): number {
    return this._spriteMesh.getTextureTimestamp(this._spriteIndex);
  }

  public set textureTimestamp(textureTimestamp: number) {
    this._spriteMesh.setTextureTimestamp(this._spriteIndex, textureTimestamp);
  }

  public get baseTextureTimestamp(): number {
    return this._spriteMesh.getBaseTextureTimestamp(this._spriteIndex);
  }

  public set baseTextureTimestamp(baseTextureTimestamp: number) {
    this._spriteMesh.setBaseTextureTimestamp(
        this._spriteIndex, baseTextureTimestamp);
  }

  /**
   * Rebase the current position and opacity into the base position and
   * opacity at the timestamp specified. If no timestamp is specified, then the
   * SpriteMesh's current time is used.
   */
  rebase(timestamp?: number) {
    this._spriteMesh.rebase(this._spriteIndex, timestamp);
  }

  /**
   * Asynchronously set this Sprite's image data and invoke the callback when
   * finished. Typically the callback will update the texture index and
   * texture timestamps to begin smooth animated tweening.
   */
  setSpriteImageData(imageData: SpriteImageData, callback?: () => any) {
    this._spriteMesh.setSpriteImageData(this._spriteIndex, imageData, callback);
  }

  /**
   * Swap between the default and sprite textures over the duration indicated.
   */
  switchTextures(startTimestamp: number, endTimestamp: number) {
    this._spriteMesh.switchTextures(
        this._spriteIndex, startTimestamp, endTimestamp);
  }
}

/**
 * Constants representing the offset values within the various data arrays of
 * the SpriteMesh's underlying geometry.
 * @see SpriteMesh:positionData.
 */
const VERTICES_PER_SPRITE = 4;
const AV = 0, BV = 1, CV = 2, DV = 3;

const POSITIONS_PER_SPRITE = 12;
const AX = 0, AY = 1, AZ = 2;
const BX = 3, BY = 4, BZ = 5;
const CX = 6, CY = 7, CZ = 8;
const DX = 9, DY = 10, DZ = 11;

const COLORS_PER_SPRITE = 16;
const AR = 0, AG = 1, AB = 2, AA = 3;
const BR = 4, BG = 5, BB = 6, BA = 7;
const CR = 8, CG = 9, CB = 10, CA = 11;
const DR = 12, DG = 13, DB = 14, DA = 15;

const FACE_INDICES_PER_SPRITE = 6;

/**
 * Constants indicating which texture to use for each sprite.
 */
export const DEFAULT_TEXTURE_INDEX = 0;
export const SPRITE_TEXTURE_INDEX = 1;

export class SpriteMesh extends THREE.Mesh {
  // SETTINGS.

  /**
   * The number of sprites this SpriteMesh is capable of representing. Must
   * be set when the object is created and is treated as immutable thereafter.
   */
  capacity: number;

  /**
   * Width of a sprite image in pixels. Defaults to 32px.
   */
  imageWidth: number;

  /**
   * Height of a sprite image in pixels. Defaults to 32px.
   */
  imageHeight: number;

  /**
   * Width of a sprite in world coordinates. Defaults to the aspect ratio of
   * imageWidth and imageHeight. Should be set prior to creating Sprites.
   */
  spriteWidth: number;

  /**
   * Height of a sprite in world coordinates. Defaults to 1. Should be set prior
   * to creating Sprites.
   */
  spriteHeight: number;

  // READ-ONLY PROPERTIES.

  /**
   * The next unused index for creating sprites.
   */
  nextIndex: number;

  /**
   * Positions of the sprite vertices. Each sprite consists of four vertices
   * (A, B, C and D) connected by two triangular faces (ABC and ACD). Each
   * vertex has three positions (X, Y and Z), so the length of the positionData
   * array is 4 vertices * 3 positions = 12 total positions per sprite.
   *
   * The face indices are stored separately in faceIndexData. Each sprite has
   * two triangular faces: ABC and ACD. 2 faces * 3 indices = 6 indices per
   * sprite.
   *
   *    D             C
   *     +-----------+
   *     |         / |   Positions:
   *     |       /   |     [  AX AY AZ   BX BY BZ   CX CY CZ   DX DY DZ  ]
   *     |     /     |
   *     |   /       |   Face Indicies:
   *     | /         |     [  AV BV CV   AV CV DV  ]
   *     +-----------+
   *    A             B
   *
   * The position data is dynamic, allowing sprite positions to change. However
   * the face index data is static since the offset indicies into the positions
   * data are known in advance.
   */
  positionData: Float32Array;

  /**
   * THREE.js BufferAttribute for the positionData.
   */
  positionAttribute: THREE.BufferAttribute;

  /**
   * Base positions for the sprite vertices. Has the same dimensionality and
   * semantics as positionData. This attribute is used by the SpriteMaterial's
   * vertex shader to animate between staring and ending position.
   */
  basePositionData: Float32Array;

  /**
   * THREE.js BufferAttribute for the basePositionData.
   */
  basePositionAttribute: THREE.BufferAttribute;

  /**
   * Color data for the sprite vertices. There are four color channels (RGBA)
   * and that data is repeated for each of the sprite's four vertecies. So
   * the length of this array will be 16 times the capacity.
   *
   * The alpha channel of this attribute does NOT indicate the tranparency level
   * of the sprite. That is controlled by the opacity attribute. Rather, the
   * alpha chanel of the color data controls how much the color is to be
   * applied to the sprite.
   *
   * A value of 0 (the default) for the alpha channel means the sprite should
   * retain its original color.
   */
  colorData: Uint8Array;

  /**
   * THREE.js BufferAttribute for the colorData.
   */
  colorAttribute: THREE.BufferAttribute;

  /**
   * Base color data for the sprite vertices. Same dimensions and semantics as
   * colorData. This attribute is used by the vertex shader to animate between
   * starting and ending color.
   */
  baseColorData: Uint8Array;

  /**
   * THREE.js BufferAttribute for baseColorData.
   */
  baseColorAttribute: THREE.BufferAttribute;

  /**
   * Stores the opacity of each sprite as a floating point number from 0-1.
   * Due to WebGL's vertex-centric design, the opacity data ends up being
   * repeated for each of the four vertices that make up a Sprite.
   *
   * TODO(jimbo): Switch to normalized Uint8.
   */
  opacityData: Float32Array;

  /**
   * THREE.js BufferAttribute for the opacityData.
   */
  opacityAttribute: THREE.BufferAttribute;

  /**
   * Stores the base opacity values for sprites. Same dimensionality and
   * semantics as opacityData.
   */
  baseOpacityData: Float32Array;

  /**
   * THREE.js BufferAttribute for the baseOpacityData.
   */
  baseOpacityAttribute: THREE.BufferAttribute;

  /**
   * Ending timestamp in ms for animating sprite position and opacity changes.
   * On or after this time, the sprite should appear at the position specified.
   * At earlier times, the position should be interpolated.
   *
   * Due to the need for greater than 32bit precision to store a JavaScript
   * timestamp (ms since Unix epoch), the values stored in this array are
   * actually a diff between the real timestamp and the time when the SpriteMesh
   * was constructed.
   *
   * The ShaderMaterial's vertex shader uses the data in timestampData and
   * baseTimestampData to determine where to render the sprite at each frame
   * and with what opacity.
   *
   * Due to WebGL's vertex-centric nature, the size of this array will be four
   * times the number of sprites, and each set of four values will be repeated.
   */
  timestampData: Float32Array;

  /**
   * THREE.js BufferAttribute for the timestampData.
   */
  timestampAttribute: THREE.BufferAttribute;

  /**
   * The base JavaScript timestamp (ms since SpriteMesh construction) for
   * animating sprite position and opacity changes. Same dimensions as
   * timestampData.
   */
  baseTimestampData: Float32Array;

  /**
   * THREE.js BufferAttribute for the baseTimestampData.
   */
  baseTimestampAttribute: THREE.BufferAttribute;

  /**
   * Indexes of face vertices for each sprite.
   * @see SpriteMesh:positionData
   */
  faceIndexData: Uint32Array;

  /**
   * THREE.js BufferAttribute for the faceIndexData.
   */
  faceIndexAttribute: THREE.BufferAttribute;

  /**
   * The vertexIndex attribute tells the SpriteMaterial's vertex shader the
   * index of the current vertex. The data array simply contains the numbers 0-N
   * where N is the total number of vertices (4 * capacity).
   *
   * Ideally these index values would be unsigned integers, but WebGL attributes
   * must be floats or vectors of floats.
   *
   * @see SpriteMaterial:vertexShader
   */
  vertexIndexData: Float32Array;

  /**
   * THREE.js BufferAttribute for the vertexIndexData.
   */
  vertexIndexAttribute: THREE.BufferAttribute;

  /**
   * Numeric value indicating which texture is currently being used by the
   * sprite. The default value is 0, meaning the default texture. 1 means the
   * sprite texture.
   *
   * TODO(jimbo): Switch to normalized Uint8.
   */
  textureIndexData: Float32Array;

  /**
   * THREE.js BufferAttribute for the textureIndexData.
   */
  textureIndexAttribute: THREE.BufferAttribute;

  /**
   * Numeric value indicating which texture was previously used by the sprite.
   * The default value is 0, meaning the default texture. 1 means the sprite
   * texture.
   *
   * TODO(jimbo): Switch to normalized Uint8.
   */
  baseTextureIndexData: Float32Array;

  /**
   * THREE.js BufferAttribute for the baseTextureIndexData.
   */
  baseTextureIndexAttribute: THREE.BufferAttribute;

  /**
   * Ending timestamp in ms for animating sprite texture changes. On or after
   * this time, the sprite should appear to be fully using the texture
   * indicated in the textureIndex. At earlier times, the pixel value will be
   * interpolated between the textureIndex texture and the baseTextureIndex
   * texture.
   *
   * Due to the need for greater than 32bit precision to store a JavaScript
   * timestamp (ms since Unix epoch), the values stored in this array are
   * actually a diff between the real timestamp and the time when the SpriteMesh
   * was constructed.
   */
  textureTimestampData: Float32Array;

  /**
   * THREE.js BufferAttribute for the textureTimestampData.
   */
  textureTimestampAttribute: THREE.BufferAttribute;

  /**
   * The base JavaScript textureTimestamp (ms since SpriteMesh construction) for
   * animating sprite position and opacity changes. Same dimensions as
   * textureTimestampData.
   */
  baseTextureTimestampData: Float32Array;

  /**
   * THREE.js BufferAttribute for the baseTextureTimestampData.
   */
  baseTextureTimestampAttribute: THREE.BufferAttribute;

  /**
   * The THREE.js BufferGeometry containing all relevant Sprite rendering data
   * as BufferAttributes.
   */
  geometry: THREE.BufferGeometry;

  /**
   * Custom sprite material for rendering sprites.
   */
  material: SpriteMaterial;

  /**
   * The default texture to apply to sprites in the absense of any other data.
   */
  defaultTexture: THREE.Texture;

  /**
   * Canvas backing the default texture.
   */
  defaultTextureCanvas: HTMLCanvasElement;

  /**
   * Sprite texture atlas for loaded sprite image data.
   */
  spriteAtlas: SpriteAtlas;

  /**
   * JavaScript timestamp when this object was created
   */
  constructionTimestamp: number;

  /**
   * Callback to be invoked before the mesh is rendered.
   *
   * TODO(jimbo): After THREE upgraded to r81+, remove this type polyfill.
   */
  onBeforeRender: (...ignore: any[]) => void;

  /**
   * Initialize the mesh with the given capacity.
   */
  constructor(capacity: number, imageWidth = 32, imageHeight = 32) {
    // Initialize THREE.js Mesh. This will create a default geometry and
    // material, which we override below.
    super();

    this.capacity = capacity;
    this.imageWidth = imageWidth;
    this.imageHeight = imageHeight;

    this.nextIndex = 0;

    this.spriteWidth = this.imageWidth / this.imageHeight;
    this.spriteHeight = 1;

    this.geometry = new THREE.BufferGeometry();

    // Position and base. 4 vertices per sprite, 3 positions per vertex.
    this.positionData = new Float32Array(POSITIONS_PER_SPRITE * capacity);
    this.positionAttribute = new THREE.BufferAttribute(this.positionData, 3);
    this.positionAttribute.setDynamic(true);
    this.geometry.addAttribute('position', this.positionAttribute);

    this.basePositionData = new Float32Array(POSITIONS_PER_SPRITE * capacity);
    this.basePositionAttribute =
        new THREE.BufferAttribute(this.basePositionData, 3);
    this.basePositionAttribute.setDynamic(true);
    this.geometry.addAttribute('basePosition', this.basePositionAttribute);

    // Color and base. 4 vertices per sprite, 4 color channels per vertex.
    this.colorData = new Uint8Array(COLORS_PER_SPRITE * capacity);
    this.colorAttribute = new THREE.BufferAttribute(this.colorData, 4);
    // TODO(jimbo): Add 'normalized' to BufferAttribute's typings upstream.
    (this.colorAttribute as any).normalized = true;
    this.colorAttribute.setDynamic(true);
    this.geometry.addAttribute('color', this.colorAttribute);

    this.baseColorData = new Uint8Array(COLORS_PER_SPRITE * capacity);
    this.baseColorAttribute = new THREE.BufferAttribute(this.baseColorData, 4);
    // TODO(jimbo): Add 'normalized' to BufferAttribute's typings upstream.
    (this.baseColorAttribute as any).normalized = true;
    this.baseColorAttribute.setDynamic(true);
    this.geometry.addAttribute('baseColor', this.baseColorAttribute);

    // Opacity and base opacity. 4 vertices per sprite.
    this.opacityData = new Float32Array(VERTICES_PER_SPRITE * capacity);
    this.opacityAttribute = new THREE.BufferAttribute(this.opacityData, 1);
    this.opacityAttribute.setDynamic(true);
    this.geometry.addAttribute('opacity', this.opacityAttribute);

    this.baseOpacityData = new Float32Array(VERTICES_PER_SPRITE * capacity);
    this.baseOpacityAttribute =
        new THREE.BufferAttribute(this.baseOpacityData, 1);
    this.baseOpacityAttribute.setDynamic(true);
    this.geometry.addAttribute('baseOpacity', this.baseOpacityAttribute);

    // Timestamp and base timestamp. 4 vertices per sprite.
    this.timestampData = new Float32Array(VERTICES_PER_SPRITE * capacity);
    this.timestampAttribute = new THREE.BufferAttribute(this.timestampData, 1);
    this.timestampAttribute.setDynamic(true);
    this.geometry.addAttribute('timestamp', this.timestampAttribute);

    this.baseTimestampData = new Float32Array(VERTICES_PER_SPRITE * capacity);
    this.baseTimestampAttribute =
        new THREE.BufferAttribute(this.baseTimestampData, 1);
    this.baseTimestampAttribute.setDynamic(true);
    this.geometry.addAttribute('baseTimestamp', this.baseTimestampAttribute);

    // 2 faces per sprite, 3 indicies per face.
    this.faceIndexData = new Uint32Array(FACE_INDICES_PER_SPRITE * capacity);
    for (let i = 0; i < capacity; i++) {
      const faceOffsetIndex = FACE_INDICES_PER_SPRITE * i;
      const vertexOffsetIndex = VERTICES_PER_SPRITE * i;
      // ABC face.
      this.faceIndexData[faceOffsetIndex + 0] = vertexOffsetIndex + AV;
      this.faceIndexData[faceOffsetIndex + 1] = vertexOffsetIndex + BV;
      this.faceIndexData[faceOffsetIndex + 2] = vertexOffsetIndex + CV;
      // ACD face.
      this.faceIndexData[faceOffsetIndex + 3] = vertexOffsetIndex + AV;
      this.faceIndexData[faceOffsetIndex + 4] = vertexOffsetIndex + CV;
      this.faceIndexData[faceOffsetIndex + 5] = vertexOffsetIndex + DV;
    }
    this.faceIndexAttribute = new THREE.BufferAttribute(this.faceIndexData, 1);
    this.geometry.setIndex(this.faceIndexAttribute);

    // Texture index and base texture index. 4 vertices per sprite.
    this.textureIndexData = new Float32Array(VERTICES_PER_SPRITE * capacity);
    this.textureIndexAttribute =
        new THREE.BufferAttribute(this.textureIndexData, 1);
    this.textureIndexAttribute.setDynamic(true);
    this.geometry.addAttribute('textureIndex', this.textureIndexAttribute);

    this.baseTextureIndexData =
        new Float32Array(VERTICES_PER_SPRITE * capacity);
    this.baseTextureIndexAttribute =
        new THREE.BufferAttribute(this.baseTextureIndexData, 1);
    this.baseTextureIndexAttribute.setDynamic(true);
    this.geometry.addAttribute(
        'baseTextureIndex', this.baseTextureIndexAttribute);

    // Texture timestamp and base texture timestamp. 4 vertices per sprite.
    this.textureTimestampData =
        new Float32Array(VERTICES_PER_SPRITE * capacity);
    this.textureTimestampAttribute =
        new THREE.BufferAttribute(this.textureTimestampData, 1);
    this.textureTimestampAttribute.setDynamic(true);
    this.geometry.addAttribute(
        'textureTimestamp', this.textureTimestampAttribute);

    this.baseTextureTimestampData =
        new Float32Array(VERTICES_PER_SPRITE * capacity);
    this.baseTextureTimestampAttribute =
        new THREE.BufferAttribute(this.baseTextureTimestampData, 1);
    this.baseTextureTimestampAttribute.setDynamic(true);
    this.geometry.addAttribute(
        'baseTextureTimestamp', this.baseTextureTimestampAttribute);

    // Fill in the vertexIndex attribute with the values 0-N.
    const totalVertices = VERTICES_PER_SPRITE * capacity;
    this.vertexIndexData = new Float32Array(totalVertices);
    for (let i = 0; i < totalVertices; i++) {
      this.vertexIndexData[i] = i;
    }
    this.vertexIndexAttribute =
        new THREE.BufferAttribute(this.vertexIndexData, 1);
    this.geometry.addAttribute('vertexIndex', this.vertexIndexAttribute);

    // Create the default texture and its backing canvas.
    this.defaultTextureCanvas = this.createDefaultTextureCanvas();
    this.defaultTexture = new THREE.Texture(this.defaultTextureCanvas);
    this.defaultTexture.minFilter = THREE.LinearFilter;
    this.defaultTexture.magFilter = THREE.NearestFilter;
    this.defaultTexture.needsUpdate = true;

    // Setup the dynamic texture and its backing canvas.
    this.spriteAtlas = new SpriteAtlas(capacity, imageWidth, imageHeight);

    this.material = new SpriteMaterial(this.defaultTexture, this.spriteAtlas);

    this.onBeforeRender = () => {
      this.material.updateAtlasUniforms();
    };

    this.constructionTimestamp = Date.now();
    this.time = this.constructionTimestamp;

    // Prevents clipping by the frustum (whole shape disappears). An alternative
    // would be to add the mesh as a child of the camera (and the camera as a
    // child of the scene) but changing the frustum culling is something we can
    // do here irrespective of the scene and camera used.
    // See http://threejs.org/docs/#Reference/Core/Object3D.frustumCulled
    this.frustumCulled = false;
  }

  /**
   * Create and return a new Sprite.
   */
  createSprite() {
    return new Sprite(this, this.nextIndex++);
  }

  public get time(): number {
    return this.material.time + this.constructionTimestamp;
  }

  public set time(time: number) {
    this.material.time = time - this.constructionTimestamp;
  }

  /**
   * Create the default texture and backing canvas.
   */
  createDefaultTextureCanvas() {
    const canvas = this.defaultTextureCanvas = document.createElement('canvas');
    const width = canvas.width = this.imageWidth;
    const height = canvas.height = this.imageHeight;
    const context = canvas.getContext('2d')!;

    // Draw in a default SVG.
    const image = new Image();
    image.onload = () => {
      context.drawImage(image, 0, 0, width, height);
      this.defaultTexture.needsUpdate = true;
    };
    image.src = URL.createObjectURL(
        new Blob([DOT_SVG], {type: 'image/svg+xml;charset=utf-8'}));

    return canvas;
  }

  /**
   * Get the X component of the specified Sprite's position.
   */
  getX(spriteIndex: number) {
    const positionOffsetIndex = spriteIndex * POSITIONS_PER_SPRITE;
    return this.positionData[positionOffsetIndex + AX];
  }

  /**
   * Set the X component of the specified Sprite's position.
   */
  setX(spriteIndex: number, x: number) {
    const positionOffsetIndex = spriteIndex * POSITIONS_PER_SPRITE;
    this.positionData[positionOffsetIndex + AX] = x;
    this.positionData[positionOffsetIndex + BX] = x + this.spriteWidth;
    this.positionData[positionOffsetIndex + CX] = x + this.spriteWidth;
    this.positionData[positionOffsetIndex + DX] = x;
    this.positionAttribute.needsUpdate = true;
  }

  /**
   * Get the Y component of the specified Sprite's position.
   */
  getY(spriteIndex: number) {
    const positionOffsetIndex = spriteIndex * POSITIONS_PER_SPRITE;
    return this.positionData[positionOffsetIndex + AY];
  }

  /**
   * Set the Y component of the specified Sprite's position.
   */
  setY(spriteIndex: number, y: number) {
    const positionOffsetIndex = spriteIndex * POSITIONS_PER_SPRITE;
    this.positionData[positionOffsetIndex + AY] = y;
    this.positionData[positionOffsetIndex + BY] = y;
    this.positionData[positionOffsetIndex + CY] = y + this.spriteHeight;
    this.positionData[positionOffsetIndex + DY] = y + this.spriteHeight;
    this.positionAttribute.needsUpdate = true;
  }

  /**
   * Get the Z component of the specified Sprite's position.
   */
  getZ(spriteIndex: number) {
    const positionOffsetIndex = spriteIndex * POSITIONS_PER_SPRITE;
    return this.positionData[positionOffsetIndex + AZ];
  }

  /**
   * Set the Z component of the specified Sprite's position.
   */
  setZ(spriteIndex: number, z: number) {
    const positionOffsetIndex = spriteIndex * POSITIONS_PER_SPRITE;
    this.positionData[positionOffsetIndex + AZ] = z;
    this.positionData[positionOffsetIndex + BZ] = z;
    this.positionData[positionOffsetIndex + CZ] = z;
    this.positionData[positionOffsetIndex + DZ] = z;
    this.positionAttribute.needsUpdate = true;
  }

  /**
   * Get the R channel of the specified Sprite's color.
   */
  getR(spriteIndex: number) {
    const colorOffsetIndex = spriteIndex * COLORS_PER_SPRITE;
    return this.colorData[colorOffsetIndex + AR];
  }

  /**
   * Set the R channel of the specified Sprite's color.
   */
  setR(spriteIndex: number, r: number) {
    const colorOffsetIndex = spriteIndex * COLORS_PER_SPRITE;
    this.colorData[colorOffsetIndex + AR] = r;
    this.colorData[colorOffsetIndex + BR] = r;
    this.colorData[colorOffsetIndex + CR] = r;
    this.colorData[colorOffsetIndex + DR] = r;
    this.colorAttribute.needsUpdate = true;
  }

  /**
   * Get the G channel of the specified Sprite's color.
   */
  getG(spriteIndex: number) {
    const colorOffsetIndex = spriteIndex * COLORS_PER_SPRITE;
    return this.colorData[colorOffsetIndex + AG];
  }

  /**
   * Set the G channel of the specified Sprite's color.
   */
  setG(spriteIndex: number, g: number) {
    const colorOffsetIndex = spriteIndex * COLORS_PER_SPRITE;
    this.colorData[colorOffsetIndex + AG] = g;
    this.colorData[colorOffsetIndex + BG] = g;
    this.colorData[colorOffsetIndex + CG] = g;
    this.colorData[colorOffsetIndex + DG] = g;
    this.colorAttribute.needsUpdate = true;
  }

  /**
   * Get the B channel of the specified Sprite's color.
   */
  getB(spriteIndex: number) {
    const colorOffsetIndex = spriteIndex * COLORS_PER_SPRITE;
    return this.colorData[colorOffsetIndex + AB];
  }

  /**
   * Set the B channel of the specified Sprite's color.
   */
  setB(spriteIndex: number, b: number) {
    const colorOffsetIndex = spriteIndex * COLORS_PER_SPRITE;
    this.colorData[colorOffsetIndex + AB] = b;
    this.colorData[colorOffsetIndex + BB] = b;
    this.colorData[colorOffsetIndex + CB] = b;
    this.colorData[colorOffsetIndex + DB] = b;
    this.colorAttribute.needsUpdate = true;
  }

  /**
   * Get the A channel of the specified Sprite's color.
   */
  getA(spriteIndex: number) {
    const colorOffsetIndex = spriteIndex * COLORS_PER_SPRITE;
    return this.colorData[colorOffsetIndex + AA];
  }

  /**
   * Set the A channel of the specified Sprite's color.
   */
  setA(spriteIndex: number, a: number) {
    const colorOffsetIndex = spriteIndex * COLORS_PER_SPRITE;
    this.colorData[colorOffsetIndex + AA] = a;
    this.colorData[colorOffsetIndex + BA] = a;
    this.colorData[colorOffsetIndex + CA] = a;
    this.colorData[colorOffsetIndex + DA] = a;
    this.colorAttribute.needsUpdate = true;
  }

  /**
   * Get the X component of the specified Sprite's base position.
   */
  getBaseX(spriteIndex: number) {
    const positionOffsetIndex = spriteIndex * POSITIONS_PER_SPRITE;
    return this.basePositionData[positionOffsetIndex + AX];
  }

  /**
   * Set the X component of the specified Sprite's base position.
   */
  setBaseX(spriteIndex: number, baseX: number) {
    const positionOffsetIndex = spriteIndex * POSITIONS_PER_SPRITE;
    this.basePositionData[positionOffsetIndex + AX] = baseX;
    this.basePositionData[positionOffsetIndex + BX] = baseX + this.spriteWidth;
    this.basePositionData[positionOffsetIndex + CX] = baseX + this.spriteWidth;
    this.basePositionData[positionOffsetIndex + DX] = baseX;
    this.basePositionAttribute.needsUpdate = true;
  }

  /**
   * Get the Y component of the specified Sprite's base position.
   */
  getBaseY(spriteIndex: number) {
    const positionOffsetIndex = spriteIndex * POSITIONS_PER_SPRITE;
    return this.basePositionData[positionOffsetIndex + AY];
  }

  /**
   * Set the Y component of the specified Sprite's base position.
   */
  setBaseY(spriteIndex: number, baseY: number) {
    const positionOffsetIndex = spriteIndex * POSITIONS_PER_SPRITE;
    this.basePositionData[positionOffsetIndex + AY] = baseY;
    this.basePositionData[positionOffsetIndex + BY] = baseY;
    this.basePositionData[positionOffsetIndex + CY] = baseY + this.spriteHeight;
    this.basePositionData[positionOffsetIndex + DY] = baseY + this.spriteHeight;
    this.basePositionAttribute.needsUpdate = true;
  }

  /**
   * Get the Z component of the specified Sprite's base position.
   */
  getBaseZ(spriteIndex: number) {
    const positionOffsetIndex = spriteIndex * POSITIONS_PER_SPRITE;
    return this.basePositionData[positionOffsetIndex + AZ];
  }

  /**
   * Set the Z component of the specified Sprite's base position.
   */
  setBaseZ(spriteIndex: number, baseZ: number) {
    const positionOffsetIndex = spriteIndex * POSITIONS_PER_SPRITE;
    this.basePositionData[positionOffsetIndex + AZ] = baseZ;
    this.basePositionData[positionOffsetIndex + BZ] = baseZ;
    this.basePositionData[positionOffsetIndex + CZ] = baseZ;
    this.basePositionData[positionOffsetIndex + DZ] = baseZ;
    this.basePositionAttribute.needsUpdate = true;
  }

  /**
   * Get the R channel of the specified Sprite's base color.
   */
  getBaseR(spriteIndex: number) {
    const colorOffsetIndex = spriteIndex * COLORS_PER_SPRITE;
    return this.baseColorData[colorOffsetIndex + AR];
  }

  /**
   * Set the R channel of the specified Sprite's base color.
   */
  setBaseR(spriteIndex: number, baseR: number) {
    const colorOffsetIndex = spriteIndex * COLORS_PER_SPRITE;
    this.baseColorData[colorOffsetIndex + AR] = baseR;
    this.baseColorData[colorOffsetIndex + BR] = baseR;
    this.baseColorData[colorOffsetIndex + CR] = baseR;
    this.baseColorData[colorOffsetIndex + DR] = baseR;
    this.baseColorAttribute.needsUpdate = true;
  }

  /**
   * Get the G channel of the specified Sprite's base color.
   */
  getBaseG(spriteIndex: number) {
    const colorOffsetIndex = spriteIndex * COLORS_PER_SPRITE;
    return this.baseColorData[colorOffsetIndex + AG];
  }

  /**
   * Set the G channel of the specified Sprite's base color.
   */
  setBaseG(spriteIndex: number, baseG: number) {
    const colorOffsetIndex = spriteIndex * COLORS_PER_SPRITE;
    this.baseColorData[colorOffsetIndex + AG] = baseG;
    this.baseColorData[colorOffsetIndex + BG] = baseG;
    this.baseColorData[colorOffsetIndex + CG] = baseG;
    this.baseColorData[colorOffsetIndex + DG] = baseG;
    this.baseColorAttribute.needsUpdate = true;
  }

  /**
   * Get the B channel of the specified Sprite's base color.
   */
  getBaseB(spriteIndex: number) {
    const colorOffsetIndex = spriteIndex * COLORS_PER_SPRITE;
    return this.baseColorData[colorOffsetIndex + AB];
  }

  /**
   * Set the B channel of the specified Sprite's base color.
   */
  setBaseB(spriteIndex: number, baseB: number) {
    const colorOffsetIndex = spriteIndex * COLORS_PER_SPRITE;
    this.baseColorData[colorOffsetIndex + AB] = baseB;
    this.baseColorData[colorOffsetIndex + BB] = baseB;
    this.baseColorData[colorOffsetIndex + CB] = baseB;
    this.baseColorData[colorOffsetIndex + DB] = baseB;
    this.baseColorAttribute.needsUpdate = true;
  }

  /**
   * Get the A channel of the specified Sprite's base color.
   */
  getBaseA(spriteIndex: number) {
    const colorOffsetIndex = spriteIndex * COLORS_PER_SPRITE;
    return this.baseColorData[colorOffsetIndex + AA];
  }

  /**
   * Set the A channel of the specified Sprite's base color.
   */
  setBaseA(spriteIndex: number, baseA: number) {
    const colorOffsetIndex = spriteIndex * COLORS_PER_SPRITE;
    this.baseColorData[colorOffsetIndex + AA] = baseA;
    this.baseColorData[colorOffsetIndex + BA] = baseA;
    this.baseColorData[colorOffsetIndex + CA] = baseA;
    this.baseColorData[colorOffsetIndex + DA] = baseA;
    this.baseColorAttribute.needsUpdate = true;
  }

  /**
   * Get the opacity of the specified Sprite.
   */
  getOpacity(spriteIndex: number) {
    const vertexOffsetIndex = spriteIndex * VERTICES_PER_SPRITE;
    return this.opacityData[vertexOffsetIndex + AV];
  }

  /**
   * Set the opacity of the specified Sprite.
   */
  setOpacity(spriteIndex: number, opacity: number) {
    const vertexOffsetIndex = spriteIndex * VERTICES_PER_SPRITE;
    this.opacityData[vertexOffsetIndex + AV] = opacity;
    this.opacityData[vertexOffsetIndex + BV] = opacity;
    this.opacityData[vertexOffsetIndex + CV] = opacity;
    this.opacityData[vertexOffsetIndex + DV] = opacity;
    this.opacityAttribute.needsUpdate = true;
  }

  /**
   * Get the base opacity of the specified Sprite.
   */
  getBaseOpacity(spriteIndex: number) {
    const vertexOffsetIndex = spriteIndex * VERTICES_PER_SPRITE;
    return this.baseOpacityData[vertexOffsetIndex + AV];
  }

  /**
   * Set the base opacity of the specified Sprite.
   */
  setBaseOpacity(spriteIndex: number, baseOpacity: number) {
    const vertexOffsetIndex = spriteIndex * VERTICES_PER_SPRITE;
    this.baseOpacityData[vertexOffsetIndex + AV] = baseOpacity;
    this.baseOpacityData[vertexOffsetIndex + BV] = baseOpacity;
    this.baseOpacityData[vertexOffsetIndex + CV] = baseOpacity;
    this.baseOpacityData[vertexOffsetIndex + DV] = baseOpacity;
    this.baseOpacityAttribute.needsUpdate = true;
  }

  /**
   * Get the Sprite's current timestamp.
   */
  getTimestamp(spriteIndex: number) {
    const vertexOffsetIndex = spriteIndex * VERTICES_PER_SPRITE;
    return this.timestampData[vertexOffsetIndex + AV] +
        this.constructionTimestamp;
  }

  /**
   * Set the Sprite's current timestamp.
   */
  setTimestamp(spriteIndex: number, timestamp: number) {
    const vertexOffsetIndex = spriteIndex * VERTICES_PER_SPRITE;
    const diffTimestamp = timestamp - this.constructionTimestamp;
    this.timestampData[vertexOffsetIndex + AV] = diffTimestamp;
    this.timestampData[vertexOffsetIndex + BV] = diffTimestamp;
    this.timestampData[vertexOffsetIndex + CV] = diffTimestamp;
    this.timestampData[vertexOffsetIndex + DV] = diffTimestamp;
    this.timestampAttribute.needsUpdate = true;
  }

  /**
   * Get the Sprite's base timestamp.
   */
  getBaseTimestamp(spriteIndex: number) {
    const vertexOffsetIndex = spriteIndex * VERTICES_PER_SPRITE;
    return this.baseTimestampData[vertexOffsetIndex + AV] +
        this.constructionTimestamp;
  }

  /**
   * Set the Sprite's base timestamp.
   */
  setBaseTimestamp(spriteIndex: number, baseTimestamp: number) {
    const vertexOffsetIndex = spriteIndex * VERTICES_PER_SPRITE;
    const diffTimestamp = baseTimestamp - this.constructionTimestamp;
    this.baseTimestampData[vertexOffsetIndex + AV] = diffTimestamp;
    this.baseTimestampData[vertexOffsetIndex + BV] = diffTimestamp;
    this.baseTimestampData[vertexOffsetIndex + CV] = diffTimestamp;
    this.baseTimestampData[vertexOffsetIndex + DV] = diffTimestamp;
    this.baseTimestampAttribute.needsUpdate = true;
  }

  /**
   * Get the textureIndex of the specified Sprite.
   */
  getTextureIndex(spriteIndex: number) {
    const vertexOffsetIndex = spriteIndex * VERTICES_PER_SPRITE;
    return this.textureIndexData[vertexOffsetIndex + AV];
  }

  /**
   * Set the textureIndex of the specified Sprite.
   */
  setTextureIndex(spriteIndex: number, textureIndex: number) {
    const vertexOffsetIndex = spriteIndex * VERTICES_PER_SPRITE;
    this.textureIndexData[vertexOffsetIndex + AV] = textureIndex;
    this.textureIndexData[vertexOffsetIndex + BV] = textureIndex;
    this.textureIndexData[vertexOffsetIndex + CV] = textureIndex;
    this.textureIndexData[vertexOffsetIndex + DV] = textureIndex;
    this.textureIndexAttribute.needsUpdate = true;
  }

  /**
   * Get the base textureIndex of the specified Sprite.
   */
  getBaseTextureIndex(spriteIndex: number) {
    const vertexOffsetIndex = spriteIndex * VERTICES_PER_SPRITE;
    return this.baseTextureIndexData[vertexOffsetIndex + AV];
  }

  /**
   * Set the base textureIndex of the specified Sprite.
   */
  setBaseTextureIndex(spriteIndex: number, baseTextureIndex: number) {
    const vertexOffsetIndex = spriteIndex * VERTICES_PER_SPRITE;
    this.baseTextureIndexData[vertexOffsetIndex + AV] = baseTextureIndex;
    this.baseTextureIndexData[vertexOffsetIndex + BV] = baseTextureIndex;
    this.baseTextureIndexData[vertexOffsetIndex + CV] = baseTextureIndex;
    this.baseTextureIndexData[vertexOffsetIndex + DV] = baseTextureIndex;
    this.baseTextureIndexAttribute.needsUpdate = true;
  }

  /**
   * Get the Sprite's current textureTimestamp.
   */
  getTextureTimestamp(spriteIndex: number) {
    const vertexOffsetIndex = spriteIndex * VERTICES_PER_SPRITE;
    return this.textureTimestampData[vertexOffsetIndex + AV] +
        this.constructionTimestamp;
  }

  /**
   * Set the Sprite's current textureTimestamp.
   */
  setTextureTimestamp(spriteIndex: number, textureTimestamp: number) {
    const vertexOffsetIndex = spriteIndex * VERTICES_PER_SPRITE;
    const diff = textureTimestamp - this.constructionTimestamp;
    this.textureTimestampData[vertexOffsetIndex + AV] = diff;
    this.textureTimestampData[vertexOffsetIndex + BV] = diff;
    this.textureTimestampData[vertexOffsetIndex + CV] = diff;
    this.textureTimestampData[vertexOffsetIndex + DV] = diff;
    this.textureTimestampAttribute.needsUpdate = true;
  }

  /**
   * Get the Sprite's base textureTimestamp.
   */
  getBaseTextureTimestamp(spriteIndex: number) {
    const vertexOffsetIndex = spriteIndex * VERTICES_PER_SPRITE;
    return this.baseTextureTimestampData[vertexOffsetIndex + AV] +
        this.constructionTimestamp;
  }

  /**
   * Set the Sprite's base textureTimestamp.
   */
  setBaseTextureTimestamp(spriteIndex: number, baseTextureTimestamp: number) {
    const vertexOffsetIndex = spriteIndex * VERTICES_PER_SPRITE;
    const diff = baseTextureTimestamp - this.constructionTimestamp;
    this.baseTextureTimestampData[vertexOffsetIndex + AV] = diff;
    this.baseTextureTimestampData[vertexOffsetIndex + BV] = diff;
    this.baseTextureTimestampData[vertexOffsetIndex + CV] = diff;
    this.baseTextureTimestampData[vertexOffsetIndex + DV] = diff;
    this.baseTextureTimestampAttribute.needsUpdate = true;
  }

  /**
   * Rebase the current position, color, and opacity of the specified Sprite
   * into the base position and opacity at the timestamp specified. If no
   * timestamp is specified, then the SpriteMesh's current time is used.
   *
   * At a high level, the purpose of this function is to prepare the sprite for
   * the next animation. Suppose we've finished animating, and now the sprite
   * is about to have new positions set.
   *
   * Calling this method will interpolate values according to the material's
   * easing method so that the next animation will smoothly pick up where this
   * one finished.
   */
  rebase(spriteIndex: number, timestamp?: number) {
    timestamp = timestamp === undefined ? this.time : timestamp;

    // To determine the new base timestamp, we have to apply the same easing
    // logic used by the shader. So the new base will not be a simple linear
    // interpolation, but rather the effective time the shader would use at
    // this frame.
    const oldBaseTimestamp = this.getBaseTimestamp(spriteIndex);
    const currentTimestamp = this.getTimestamp(spriteIndex);

    // Proportion of current values to apply to base. 0 means use entirely base,
    // 1 means entirely current values.
    const blend = timestamp >= currentTimestamp ?
        1 :
        timestamp <= oldBaseTimestamp ?
        0 :
        this.material.applyEasing(
            (timestamp - oldBaseTimestamp) /
            (currentTimestamp - oldBaseTimestamp));

    // Convenience method for linear interpolation.
    const lerp = (v0: number, v1: number) => {
      return v0 * blend + v1 * (1 - blend);
    };

    // Apply blending to update base position, color, and opacity.
    this.setBaseX(
        spriteIndex, lerp(this.getX(spriteIndex), this.getBaseX(spriteIndex)));
    this.setBaseY(
        spriteIndex, lerp(this.getY(spriteIndex), this.getBaseY(spriteIndex)));
    this.setBaseZ(
        spriteIndex, lerp(this.getZ(spriteIndex), this.getBaseZ(spriteIndex)));
    this.setBaseR(
        spriteIndex, lerp(this.getR(spriteIndex), this.getBaseR(spriteIndex)));
    this.setBaseG(
        spriteIndex, lerp(this.getG(spriteIndex), this.getBaseG(spriteIndex)));
    this.setBaseB(
        spriteIndex, lerp(this.getB(spriteIndex), this.getBaseB(spriteIndex)));
    this.setBaseA(
        spriteIndex, lerp(this.getA(spriteIndex), this.getBaseA(spriteIndex)));
    this.setBaseOpacity(
        spriteIndex,
        lerp(this.getOpacity(spriteIndex), this.getBaseOpacity(spriteIndex)));

    // When setting the new base timestamp, we should apply the same blending
    // alogrithm except if the rebase timestamp is later than the sprite's
    // current timestamp. In that case we should use the passed in value.
    const newBaseTimestamp = timestamp >= currentTimestamp ?
        timestamp :
        lerp(currentTimestamp, oldBaseTimestamp);
    this.setBaseTimestamp(spriteIndex, newBaseTimestamp);
  }

  /**
   * Set image data for the selected sprite, invoke callback when finished.
   */
  setSpriteImageData(
      spriteIndex: number, imageData: SpriteImageData,
      callback?: (spriteIndex: number) => any) {
    this.spriteAtlas.setSpriteImageData(spriteIndex, imageData, callback);
  }

  /**
   * Switch between the default and sprite texture over the duration specified.
   */
  switchTextures(
      spriteIndex: number, startTimestamp: number, endTimestamp: number) {
    const oldTextureIndex = this.getTextureIndex(spriteIndex);
    this.setBaseTextureIndex(spriteIndex, oldTextureIndex);
    this.setTextureIndex(
        spriteIndex,
        oldTextureIndex === DEFAULT_TEXTURE_INDEX ? SPRITE_TEXTURE_INDEX :
                                                    DEFAULT_TEXTURE_INDEX);
    this.setBaseTextureTimestamp(spriteIndex, startTimestamp);
    this.setTextureTimestamp(spriteIndex, endTimestamp);
  }

  /**
   * Given X and Y in world coordinates, determine which sprites (if any) span
   * the line through this point perpendicular to the XY plane. This substitutes
   * for full raycasting support, and presumes that the camera is looking down
   * on the sprites in the XY plane from the Z axis.
   *
   * If no sprites intersect the point, then an empty array is returned.
   */
  findSprites(x: number, y: number): number[] {
    // This naive implementation is significantly slower than what could be
    // achieved by maintaining a quadtree or octree.
    const spriteIndexes: number[] = [];
    for (let spriteIndex = 0; spriteIndex < this.capacity; spriteIndex++) {
      const positionOffsetIndex = spriteIndex * POSITIONS_PER_SPRITE;
      if (x >= this.positionData[positionOffsetIndex + AX] &&
          x <= this.positionData[positionOffsetIndex + CX] &&
          y >= this.positionData[positionOffsetIndex + AY] &&
          y <= this.positionData[positionOffsetIndex + CY]) {
        spriteIndexes.push(spriteIndex);
      }
    }
    return spriteIndexes;
  }
}

export const DOT_SVG = `
<svg id="svg" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="400" height="295.03546099290776" viewBox="0, 0, 400,295.03546099290776"><g id="svgg"><path id="path0" d="M255.075 29.692 C 255.494 30.196,256.036 30.248,255.876 29.767 C 255.813 29.579,255.529 29.390,255.244 29.348 C 254.829 29.287,254.796 29.355,255.075 29.692 M268.185 37.083 C 268.448 37.346,268.752 37.472,268.862 37.362 C 268.971 37.253,268.865 37.040,268.626 36.889 C 267.929 36.448,267.665 36.564,268.185 37.083 M114.760 46.336 C 114.009 47.068,114.126 47.365,114.886 46.657 C 115.240 46.327,115.472 46.007,115.403 45.945 C 115.334 45.883,115.044 46.059,114.760 46.336 M0.189 111.496 C -0.415 112.100,0.016 184.709,0.621 184.335 C 0.767 184.245,0.886 184.376,0.886 184.626 C 0.886 184.884,1.237 185.155,1.697 185.252 C 2.808 185.485,3.395 185.828,3.395 186.242 C 3.395 186.662,4.160 187.177,4.484 186.976 C 4.612 186.898,5.082 187.172,5.528 187.586 C 5.975 188.001,6.541 188.355,6.787 188.374 C 7.032 188.392,7.409 188.425,7.624 188.447 C 7.840 188.469,8.172 188.777,8.363 189.132 C 8.553 189.487,8.808 189.785,8.930 189.796 C 9.052 189.807,9.491 189.815,9.907 189.815 C 10.322 189.815,10.595 189.925,10.512 190.058 C 10.174 190.605,11.636 191.331,13.069 191.328 C 13.357 191.328,13.524 191.437,13.442 191.570 C 13.359 191.704,13.722 191.993,14.247 192.213 C 15.187 192.607,15.353 192.657,15.941 192.731 C 16.103 192.751,16.236 193.019,16.236 193.326 C 16.236 193.634,16.442 193.964,16.694 194.061 C 16.959 194.163,17.076 194.113,16.971 193.943 C 16.867 193.775,17.110 193.795,17.537 193.989 C 17.948 194.177,18.223 194.429,18.147 194.551 C 18.026 194.747,18.704 195.182,19.237 195.251 C 19.346 195.265,19.525 195.367,19.635 195.478 C 19.746 195.588,20.044 195.599,20.299 195.501 C 20.604 195.384,20.688 195.441,20.548 195.669 C 20.420 195.877,20.518 196.015,20.794 196.015 C 21.048 196.015,21.255 196.214,21.255 196.458 C 21.255 196.701,21.354 196.885,21.476 196.865 C 22.154 196.758,23.032 196.947,23.374 197.273 C 23.845 197.723,25.448 198.500,25.756 198.428 C 25.878 198.400,25.978 198.506,25.978 198.664 C 25.978 198.920,27.508 199.874,27.894 199.858 C 28.701 199.826,28.999 199.882,28.846 200.035 C 28.548 200.333,29.554 201.160,30.226 201.171 C 30.576 201.177,30.847 201.374,30.848 201.624 C 30.848 201.867,30.982 202.071,31.144 202.077 C 31.306 202.083,31.721 202.244,32.065 202.435 C 32.408 202.627,32.784 202.690,32.898 202.575 C 33.013 202.460,33.236 202.598,33.395 202.881 C 33.553 203.163,33.875 203.395,34.111 203.395 C 34.346 203.395,34.539 203.528,34.539 203.690 C 34.539 203.852,34.785 203.985,35.086 203.985 C 35.387 203.985,35.987 204.313,36.418 204.713 C 36.855 205.117,37.398 205.365,37.642 205.271 C 37.889 205.177,38.081 205.267,38.081 205.479 C 38.081 205.686,38.167 205.769,38.271 205.665 C 38.376 205.560,38.907 205.866,39.452 206.344 C 40.089 206.904,40.619 207.147,40.937 207.024 C 41.315 206.879,41.385 206.954,41.235 207.344 C 41.128 207.624,41.156 207.782,41.298 207.694 C 41.440 207.606,41.714 207.724,41.907 207.956 C 42.100 208.188,42.435 208.310,42.652 208.227 C 42.877 208.140,43.130 208.339,43.242 208.691 C 43.349 209.030,43.561 209.231,43.711 209.138 C 43.862 209.045,43.985 209.117,43.985 209.299 C 43.985 209.480,44.103 209.556,44.247 209.467 C 44.638 209.226,46.277 209.871,46.456 210.337 C 46.541 210.561,47.142 210.887,47.790 211.061 C 48.507 211.254,49.038 211.599,49.147 211.943 C 49.262 212.304,49.532 212.467,49.897 212.397 C 50.211 212.337,50.546 212.414,50.641 212.569 C 50.737 212.724,50.939 212.775,51.091 212.681 C 51.242 212.588,51.365 212.660,51.365 212.841 C 51.365 213.023,51.497 213.090,51.657 212.991 C 51.830 212.884,51.870 213.016,51.755 213.317 C 51.628 213.646,51.674 213.753,51.885 213.623 C 52.064 213.512,52.294 213.557,52.396 213.722 C 52.498 213.887,52.839 214.022,53.154 214.022 C 53.469 214.022,53.727 214.200,53.727 214.418 C 53.727 214.635,54.068 214.968,54.484 215.158 C 54.921 215.357,55.163 215.377,55.057 215.205 C 54.716 214.654,55.177 214.902,56.015 215.722 C 56.478 216.174,57.088 216.489,57.389 216.431 C 57.760 216.360,57.858 216.443,57.702 216.696 C 57.552 216.937,57.594 216.991,57.820 216.851 C 58.015 216.731,58.564 216.970,59.069 217.396 C 59.585 217.830,60.339 218.155,60.829 218.155 C 61.484 218.155,61.727 218.320,61.861 218.852 C 61.984 219.341,62.228 219.534,62.678 219.499 C 63.032 219.471,63.487 219.573,63.690 219.724 C 63.893 219.875,64.059 219.896,64.059 219.772 C 64.059 219.647,64.377 219.888,64.767 220.308 C 65.311 220.896,65.690 221.044,66.412 220.953 C 67.459 220.821,68.487 221.322,68.487 221.965 C 68.487 222.197,68.574 222.299,68.681 222.192 C 68.788 222.085,69.040 222.134,69.241 222.301 C 69.441 222.467,69.719 222.583,69.858 222.558 C 70.470 222.449,71.436 222.602,71.404 222.804 C 71.325 223.303,71.453 223.762,71.661 223.729 C 72.397 223.613,72.861 223.852,73.157 224.504 C 73.343 224.911,73.597 225.227,73.721 225.207 C 74.777 225.036,75.572 225.293,75.572 225.807 C 75.572 226.331,76.634 226.820,77.857 226.858 C 78.059 226.865,78.192 226.965,78.152 227.082 C 78.002 227.530,79.572 228.311,80.466 228.234 C 81.187 228.172,81.432 228.287,81.551 228.744 C 81.656 229.143,82.057 229.400,82.795 229.538 C 83.523 229.675,83.987 229.967,84.193 230.420 C 84.363 230.792,84.665 231.035,84.864 230.958 C 85.063 230.882,85.437 231.140,85.694 231.533 C 86.023 232.035,86.387 232.223,86.919 232.165 C 87.335 232.119,87.675 232.203,87.675 232.351 C 87.675 232.499,87.866 232.620,88.098 232.620 C 88.331 232.620,88.605 232.886,88.708 233.210 C 88.901 233.817,89.010 233.859,90.416 233.872 C 90.867 233.876,91.173 233.944,91.094 234.023 C 90.895 234.222,91.692 234.982,92.100 234.982 C 92.283 234.982,92.366 235.090,92.284 235.223 C 92.202 235.356,92.526 235.408,93.005 235.337 C 93.493 235.266,93.875 235.345,93.875 235.518 C 93.875 235.687,94.456 236.218,95.166 236.697 C 96.259 237.435,96.436 237.483,96.313 237.013 C 96.204 236.598,96.326 236.458,96.792 236.458 C 97.151 236.458,97.417 236.646,97.417 236.900 C 97.417 237.144,97.288 237.343,97.131 237.343 C 96.974 237.343,96.922 237.542,97.015 237.786 C 97.108 238.030,97.436 238.229,97.744 238.229 C 98.120 238.229,98.303 238.438,98.303 238.868 C 98.303 239.220,98.386 239.424,98.489 239.322 C 98.592 239.219,98.924 239.268,99.227 239.430 C 99.559 239.608,99.779 239.615,99.779 239.448 C 99.779 238.989,101.241 239.809,101.423 240.369 C 101.528 240.694,101.888 240.886,102.396 240.886 C 102.840 240.886,103.382 241.052,103.601 241.255 C 103.922 241.553,103.953 241.544,103.762 241.209 C 103.603 240.931,103.637 240.864,103.866 241.005 C 104.053 241.121,104.207 241.399,104.207 241.624 C 104.207 241.868,104.710 242.131,105.461 242.280 C 106.151 242.416,106.716 242.678,106.716 242.861 C 106.716 243.044,107.108 243.502,107.587 243.879 C 108.067 244.256,108.355 244.397,108.228 244.191 C 108.058 243.917,108.195 243.853,108.742 243.953 C 109.151 244.027,109.557 243.932,109.643 243.741 C 109.730 243.551,109.789 243.661,109.774 243.985 C 109.724 245.106,109.817 245.314,110.372 245.314 C 110.678 245.314,111.133 245.625,111.382 246.006 C 111.688 246.473,112.135 246.707,112.757 246.725 C 113.289 246.740,113.976 247.038,114.385 247.432 C 114.774 247.807,115.267 248.127,115.480 248.145 C 115.693 248.162,116.100 248.196,116.384 248.221 C 116.668 248.245,116.900 248.451,116.900 248.677 C 116.900 249.163,117.532 249.446,118.622 249.447 C 119.163 249.448,119.590 249.718,119.988 250.312 C 120.307 250.787,120.672 251.111,120.800 251.032 C 120.928 250.952,121.033 251.095,121.033 251.348 C 121.033 251.601,121.174 251.808,121.346 251.808 C 121.518 251.808,121.593 251.915,121.512 252.045 C 121.431 252.176,121.656 252.290,122.011 252.299 C 123.676 252.340,123.924 252.428,124.081 253.028 C 124.202 253.491,124.407 253.615,124.854 253.498 C 125.188 253.411,125.388 253.460,125.297 253.607 C 125.206 253.754,125.417 253.875,125.766 253.875 C 126.114 253.875,126.629 254.157,126.908 254.503 C 127.188 254.848,127.741 255.163,128.137 255.203 C 128.532 255.243,129.013 255.292,129.205 255.313 C 129.397 255.334,129.639 255.616,129.742 255.941 C 129.845 256.266,130.065 256.531,130.231 256.531 C 130.397 256.531,130.797 256.830,131.119 257.196 C 131.442 257.561,131.629 257.706,131.534 257.517 C 131.251 256.950,131.685 256.236,132.314 256.236 C 132.731 256.236,132.852 256.373,132.725 256.703 C 132.627 256.960,132.546 257.233,132.546 257.311 C 132.546 257.388,132.396 257.359,132.213 257.246 C 132.010 257.120,131.934 257.200,132.019 257.450 C 132.096 257.676,132.447 257.818,132.801 257.766 C 133.270 257.698,133.542 257.898,133.807 258.504 C 134.093 259.159,134.379 259.346,135.155 259.382 C 135.706 259.408,136.439 259.710,136.820 260.068 C 137.434 260.644,137.979 260.870,138.917 260.937 C 139.092 260.949,139.401 261.268,139.602 261.644 C 139.898 262.196,140.193 262.320,141.128 262.285 C 142.239 262.244,142.471 262.459,142.323 263.395 C 142.304 263.517,142.387 263.601,142.509 263.581 C 143.276 263.460,143.809 263.663,143.671 264.022 C 143.473 264.539,144.595 265.139,145.441 264.969 C 145.891 264.878,146.231 265.062,146.570 265.579 C 146.853 266.011,147.230 266.252,147.476 266.158 C 147.707 266.069,147.897 266.125,147.897 266.282 C 147.897 266.440,148.229 266.568,148.635 266.568 C 149.176 266.568,149.373 266.726,149.373 267.159 C 149.373 267.515,149.578 267.759,149.889 267.773 C 151.684 267.858,152.375 268.158,152.689 268.991 C 152.732 269.105,153.257 269.232,153.855 269.271 C 154.454 269.311,154.877 269.450,154.796 269.581 C 154.715 269.712,154.857 269.899,155.110 269.997 C 155.364 270.094,155.572 270.367,155.572 270.603 C 155.572 270.838,155.681 270.964,155.813 270.882 C 155.946 270.800,156.241 270.991,156.469 271.307 C 156.697 271.623,157.061 271.882,157.278 271.882 C 157.495 271.882,157.583 272.028,157.473 272.207 C 157.330 272.437,157.453 272.434,157.893 272.199 C 158.418 271.918,158.614 271.981,159.154 272.602 C 159.506 273.007,159.907 273.268,160.044 273.183 C 160.182 273.098,160.295 273.169,160.295 273.341 C 160.295 273.512,160.729 273.653,161.258 273.653 C 161.971 273.653,162.297 273.824,162.513 274.312 C 162.721 274.782,163.098 274.995,163.827 275.052 C 164.389 275.096,164.959 275.329,165.094 275.570 C 165.529 276.347,166.429 276.661,167.135 276.283 C 167.802 275.926,168.750 276.651,168.386 277.239 C 168.301 277.378,168.379 277.491,168.561 277.491 C 168.742 277.491,168.815 277.614,168.721 277.766 C 168.628 277.917,168.707 278.137,168.897 278.254 C 169.113 278.387,169.163 278.340,169.032 278.127 C 168.916 277.939,168.962 277.786,169.134 277.786 C 169.306 277.786,169.446 278.052,169.446 278.376 C 169.446 278.961,169.761 279.080,171.144 279.022 C 171.736 278.998,171.945 279.263,171.846 279.917 C 171.790 280.287,173.109 280.859,173.819 280.773 C 174.227 280.724,174.722 280.944,175.047 281.319 C 175.347 281.665,176.065 282.024,176.642 282.118 C 177.281 282.221,177.867 282.553,178.136 282.964 C 178.441 283.430,178.766 283.591,179.183 283.482 C 179.628 283.365,179.744 283.438,179.622 283.755 C 179.531 283.992,179.644 284.341,179.872 284.531 C 180.215 284.815,180.263 284.746,180.147 284.135 C 180.064 283.702,180.142 283.395,180.335 283.395 C 180.516 283.395,180.664 283.598,180.664 283.847 C 180.664 284.096,180.863 284.375,181.105 284.468 C 181.348 284.561,181.473 284.756,181.383 284.902 C 181.293 285.047,181.427 285.166,181.680 285.166 C 181.933 285.166,182.140 285.351,182.140 285.577 C 182.140 286.064,182.772 286.347,183.862 286.348 C 184.397 286.348,184.829 286.616,185.209 287.184 C 185.639 287.826,185.939 287.987,186.505 287.879 C 187.017 287.781,187.384 287.926,187.716 288.358 C 187.978 288.699,188.657 289.055,189.225 289.150 C 189.839 289.252,190.478 289.617,190.801 290.050 C 191.099 290.450,191.464 290.703,191.612 290.611 C 191.761 290.520,191.882 290.644,191.882 290.888 C 191.882 291.511,193.105 292.326,193.479 291.953 C 193.860 291.572,194.332 291.574,194.096 291.956 C 193.996 292.118,194.112 292.251,194.354 292.251 C 194.596 292.251,194.877 292.512,194.978 292.832 C 195.116 293.266,195.408 293.403,196.133 293.376 C 197.251 293.334,197.786 293.590,197.786 294.167 C 197.786 294.785,198.852 294.993,200.696 294.734 C 201.626 294.604,202.068 294.451,201.697 294.389 C 201.090 294.286,200.893 293.986,201.005 293.336 C 201.029 293.203,201.043 277.797,201.037 259.101 L 201.026 225.109 200.218 224.447 C 199.773 224.083,198.878 223.505,198.229 223.163 C 197.579 222.821,196.384 222.159,195.572 221.692 C 194.760 221.225,193.565 220.565,192.915 220.226 C 192.266 219.888,191.070 219.219,190.258 218.739 C 189.446 218.260,188.317 217.617,187.749 217.309 C 185.812 216.261,184.356 215.453,182.878 214.605 C 182.066 214.139,180.871 213.479,180.221 213.139 C 179.572 212.799,178.555 212.228,177.961 211.869 C 177.368 211.511,175.840 210.648,174.566 209.951 C 173.293 209.254,172.052 208.555,171.808 208.397 C 171.565 208.240,170.834 207.841,170.185 207.512 C 169.535 207.183,168.472 206.603,167.823 206.222 C 167.173 205.841,165.967 205.149,165.142 204.683 C 164.318 204.218,161.886 202.841,159.740 201.624 C 157.593 200.406,155.473 199.210,155.028 198.967 C 153.396 198.073,148.377 195.254,147.050 194.486 C 146.298 194.050,145.369 193.550,144.985 193.373 C 144.602 193.197,143.473 192.572,142.476 191.984 C 141.480 191.397,139.668 190.385,138.450 189.736 C 137.232 189.087,136.037 188.403,135.793 188.215 C 135.550 188.027,134.886 187.643,134.317 187.362 C 133.749 187.081,132.620 186.466,131.808 185.997 C 130.996 185.528,129.934 184.935,129.446 184.681 C 128.959 184.426,127.897 183.821,127.085 183.337 C 126.273 182.852,125.077 182.179,124.428 181.840 C 123.779 181.501,122.583 180.838,121.771 180.367 C 120.959 179.895,119.897 179.294,119.410 179.031 C 118.923 178.767,117.860 178.171,117.048 177.705 C 116.236 177.238,115.041 176.580,114.391 176.241 C 113.742 175.902,112.546 175.230,111.734 174.747 C 110.923 174.263,109.727 173.598,109.077 173.268 C 108.428 172.938,107.365 172.345,106.716 171.950 C 105.396 171.148,103.472 170.076,101.697 169.154 C 101.048 168.816,99.852 168.144,99.041 167.660 C 98.229 167.175,97.100 166.567,96.531 166.308 C 95.963 166.049,95.432 165.747,95.351 165.636 C 95.176 165.397,83.944 159.114,83.692 159.114 C 83.597 159.114,83.159 158.862,82.719 158.554 C 82.279 158.246,78.148 155.888,73.538 153.314 C 68.929 150.741,64.545 148.274,63.797 147.833 C 63.048 147.392,61.904 146.758,61.255 146.423 C 60.605 146.089,59.675 145.586,59.188 145.306 C 58.701 145.026,57.373 144.270,56.236 143.625 C 55.100 142.980,53.771 142.226,53.284 141.949 C 52.797 141.671,51.734 141.103,50.923 140.684 C 50.111 140.266,48.915 139.597,48.266 139.198 C 47.616 138.798,46.663 138.269,46.147 138.023 C 45.631 137.776,44.502 137.155,43.638 136.642 C 42.774 136.129,41.469 135.379,40.738 134.974 C 38.094 133.510,37.318 133.076,35.867 132.252 C 35.055 131.791,33.708 131.068,32.873 130.645 C 32.038 130.222,30.867 129.545,30.271 129.141 C 29.675 128.736,28.764 128.202,28.247 127.953 C 27.729 127.705,26.689 127.142,25.935 126.703 C 25.180 126.263,23.852 125.506,22.983 125.020 C 22.113 124.534,21.004 123.907,20.517 123.628 C 20.030 123.349,19.100 122.836,18.450 122.489 C 17.801 122.142,16.605 121.475,15.793 121.007 C 14.982 120.540,13.786 119.881,13.137 119.544 C 12.487 119.207,11.292 118.541,10.480 118.066 C 9.668 117.590,8.605 116.997,8.118 116.748 C 7.631 116.499,6.568 115.898,5.756 115.413 C 4.298 114.541,2.406 113.605,1.402 113.259 C 1.098 113.154,0.886 112.782,0.886 112.351 C 0.886 111.603,0.525 111.160,0.189 111.496 M399.041 113.770 L 398.229 114.625 398.228 148.604 L 398.227 182.583 397.121 183.191 C 396.513 183.525,396.043 183.943,396.078 184.120 C 396.116 184.307,395.888 184.375,395.533 184.282 C 395.110 184.171,394.729 184.359,394.288 184.894 C 393.939 185.318,393.255 185.731,392.768 185.812 C 392.280 185.893,391.700 186.229,391.477 186.559 C 391.208 186.958,390.747 187.159,390.104 187.159 C 389.377 187.159,389.000 187.361,388.590 187.970 C 388.290 188.417,387.878 188.796,387.675 188.812 C 387.472 188.828,387.050 188.861,386.736 188.886 C 386.422 188.910,386.084 189.187,385.984 189.501 C 385.869 189.864,385.598 190.032,385.242 189.963 C 384.933 189.904,384.190 190.245,383.591 190.721 C 382.992 191.197,382.263 191.587,381.972 191.587 C 381.680 191.587,381.365 191.830,381.270 192.128 C 381.176 192.426,380.901 192.691,380.660 192.718 C 380.419 192.745,380.042 192.790,379.822 192.817 C 379.602 192.844,379.173 193.237,378.868 193.691 C 378.446 194.318,378.153 194.475,377.644 194.348 C 377.249 194.249,376.974 194.314,376.974 194.507 C 376.974 194.687,376.875 194.818,376.753 194.799 C 376.227 194.716,375.710 194.849,375.884 195.023 C 375.988 195.127,375.644 195.430,375.121 195.697 C 374.598 195.964,374.200 196.333,374.236 196.518 C 374.272 196.703,373.628 196.999,372.802 197.176 C 371.976 197.353,370.966 197.762,370.555 198.085 C 370.145 198.408,369.638 198.672,369.428 198.672 C 369.218 198.672,368.691 199.103,368.257 199.631 C 367.823 200.159,367.555 200.424,367.663 200.221 C 367.900 199.773,367.347 199.723,367.072 200.168 C 366.965 200.341,366.685 200.409,366.449 200.319 C 366.214 200.228,366.093 200.271,366.181 200.413 C 366.452 200.851,364.392 201.859,363.702 201.626 C 363.627 201.601,363.484 201.811,363.385 202.093 C 363.222 202.558,362.738 202.781,361.697 202.871 C 361.494 202.888,361.390 202.965,361.466 203.040 C 361.705 203.279,361.018 204.301,360.649 204.255 C 359.557 204.118,358.898 204.331,358.758 204.868 C 358.674 205.190,358.487 205.382,358.343 205.293 C 358.199 205.204,358.081 205.286,358.081 205.475 C 358.081 205.665,357.898 205.749,357.674 205.664 C 357.451 205.578,357.118 205.656,356.936 205.839 C 356.754 206.021,356.604 206.044,356.603 205.889 C 356.602 205.735,356.370 205.941,356.087 206.347 C 355.804 206.753,355.401 207.120,355.193 207.162 C 354.502 207.303,353.509 207.483,353.304 207.506 C 353.193 207.518,353.017 207.797,352.913 208.126 C 352.808 208.455,352.567 208.705,352.376 208.681 C 351.381 208.558,350.701 208.752,350.701 209.159 C 350.701 209.421,350.338 209.682,349.831 209.783 C 349.352 209.879,348.733 210.207,348.456 210.514 C 348.179 210.820,347.827 211.070,347.672 211.070 C 347.518 211.070,346.801 211.469,346.080 211.956 C 345.358 212.443,344.508 212.841,344.192 212.841 C 343.875 212.841,343.616 213.036,343.616 213.274 C 343.616 213.822,342.764 214.283,341.583 214.373 C 341.002 214.417,340.603 214.637,340.497 214.971 C 340.405 215.261,340.149 215.498,339.929 215.498 C 339.709 215.498,339.138 215.827,338.661 216.228 C 338.184 216.629,337.726 216.890,337.644 216.807 C 337.404 216.568,335.831 217.357,335.408 217.929 C 335.195 218.216,334.797 218.459,334.522 218.470 C 333.825 218.497,331.348 220.375,331.446 220.801 C 331.491 220.993,331.397 221.070,331.238 220.972 C 331.079 220.873,331.031 220.576,331.133 220.311 C 331.257 219.989,331.204 219.900,330.973 220.043 C 330.783 220.160,330.627 220.581,330.627 220.977 C 330.627 221.373,330.499 221.697,330.341 221.697 C 330.184 221.697,330.132 221.897,330.225 222.140 C 330.319 222.384,330.588 222.583,330.824 222.583 C 331.060 222.583,331.165 222.441,331.058 222.268 C 330.769 221.800,331.842 221.099,332.731 221.174 C 333.157 221.211,333.747 221.044,334.042 220.805 C 334.360 220.547,334.488 220.519,334.357 220.738 C 334.235 220.941,334.268 221.107,334.430 221.107 C 334.592 221.107,334.808 220.974,334.908 220.811 C 335.030 220.614,335.283 220.618,335.664 220.821 C 336.102 221.056,336.236 221.032,336.236 220.720 C 336.236 220.496,336.502 220.072,336.827 219.779 C 337.151 219.485,337.417 219.336,337.417 219.448 C 337.417 219.560,337.683 219.510,338.007 219.336 C 338.332 219.162,338.598 218.759,338.598 218.440 C 338.598 218.121,338.731 217.860,338.893 217.860 C 339.055 217.860,339.188 217.989,339.188 218.148 C 339.188 218.329,339.449 218.336,339.896 218.167 C 340.285 218.019,340.684 217.978,340.781 218.075 C 340.879 218.173,340.959 217.966,340.959 217.614 C 340.959 217.242,341.145 216.974,341.402 216.974 C 341.646 216.974,341.845 216.859,341.845 216.718 C 341.845 216.577,342.242 216.507,342.726 216.564 C 343.468 216.650,343.686 216.515,344.102 215.713 C 344.374 215.189,344.648 214.912,344.711 215.098 C 344.880 215.596,346.027 215.227,346.802 214.426 C 347.173 214.042,347.804 213.727,348.204 213.727 C 348.652 213.727,348.930 213.558,348.930 213.284 C 348.930 213.041,349.063 212.825,349.225 212.804 C 349.387 212.784,349.649 212.751,349.806 212.731 C 350.289 212.668,351.326 211.659,351.168 211.405 C 351.087 211.273,351.539 211.180,352.174 211.198 C 353.465 211.236,354.423 210.713,354.080 210.159 C 353.938 209.928,353.980 209.874,354.198 210.009 C 354.407 210.138,354.540 210.013,354.543 209.685 C 354.546 209.320,354.620 209.265,354.776 209.511 C 355.046 209.936,356.812 208.988,357.087 208.269 C 357.209 207.951,357.397 207.910,357.781 208.115 C 358.184 208.331,358.502 208.217,359.132 207.633 C 359.586 207.212,360.253 206.851,360.615 206.829 C 360.976 206.807,361.214 206.697,361.144 206.583 C 361.003 206.354,362.232 205.594,362.583 205.694 C 362.705 205.728,362.804 205.608,362.804 205.427 C 362.804 205.238,363.068 205.166,363.422 205.259 C 363.947 205.396,364.013 205.318,363.867 204.733 C 363.752 204.276,363.841 203.990,364.135 203.878 C 364.377 203.785,364.576 203.833,364.576 203.985 C 364.576 204.137,364.742 204.211,364.945 204.148 C 365.148 204.086,365.679 203.955,366.125 203.857 C 366.697 203.732,366.937 203.495,366.937 203.060 C 366.937 202.558,367.078 202.467,367.675 202.581 C 368.081 202.659,368.413 202.600,368.413 202.451 C 368.413 202.301,368.546 202.261,368.707 202.361 C 368.869 202.461,369.158 202.198,369.350 201.776 C 369.550 201.337,369.866 201.074,370.089 201.160 C 370.304 201.242,370.480 201.166,370.480 200.990 C 370.480 200.808,370.796 200.730,371.209 200.809 C 371.610 200.885,371.880 200.854,371.809 200.740 C 371.739 200.625,372.008 200.247,372.409 199.899 C 372.809 199.551,373.137 199.355,373.137 199.463 C 373.137 199.571,373.454 199.362,373.842 198.998 C 374.229 198.633,374.728 198.372,374.949 198.418 C 375.504 198.531,376.679 197.732,376.679 197.241 C 376.679 197.007,376.862 196.907,377.112 197.003 C 377.351 197.095,377.616 197.055,377.703 196.915 C 377.790 196.775,378.134 196.732,378.468 196.819 C 378.914 196.936,379.119 196.812,379.239 196.352 C 379.329 196.008,379.521 195.799,379.665 195.888 C 379.808 195.977,379.926 195.915,379.926 195.750 C 379.926 195.586,380.387 195.365,380.949 195.259 C 381.590 195.139,382.040 194.855,382.153 194.500 C 382.252 194.188,382.489 193.958,382.679 193.989 C 383.266 194.083,384.649 193.605,384.649 193.309 C 384.649 193.154,384.496 193.123,384.309 193.239 C 384.102 193.366,384.048 193.320,384.170 193.121 C 384.282 192.941,384.567 192.868,384.804 192.959 C 385.045 193.051,385.315 192.916,385.416 192.652 C 385.515 192.393,385.709 192.250,385.846 192.335 C 385.984 192.419,386.240 192.219,386.416 191.890 C 386.615 191.519,387.042 191.288,387.538 191.282 C 388.482 191.271,389.373 190.671,389.373 190.046 C 389.373 189.711,389.665 189.624,390.576 189.689 C 391.640 189.765,391.820 189.682,392.126 188.976 C 392.417 188.305,392.653 188.179,393.604 188.185 C 394.678 188.192,395.101 187.975,395.325 187.306 C 395.380 187.144,395.524 187.044,395.646 187.085 C 395.768 187.125,395.867 187.010,395.867 186.829 C 395.867 186.645,396.127 186.567,396.458 186.654 C 396.802 186.744,397.048 186.663,397.048 186.459 C 397.048 185.909,398.015 185.233,398.745 185.272 C 399.111 185.291,399.410 185.137,399.410 184.929 C 399.410 184.721,399.543 184.507,399.706 184.452 C 399.903 184.387,399.977 172.347,399.927 148.634 L 399.852 112.915 399.041 113.770 M329.114 222.435 C 329.094 222.517,329.061 222.705,329.041 222.854 C 328.986 223.254,328.561 223.617,328.561 223.264 C 328.561 223.090,328.213 223.029,327.749 223.121 L 326.937 223.282 327.675 223.494 C 328.351 223.687,328.359 223.707,327.769 223.734 C 327.394 223.752,326.853 224.165,326.473 224.723 L 325.821 225.683 326.613 224.871 C 327.048 224.424,327.656 224.059,327.965 224.059 C 328.274 224.059,328.605 223.932,328.701 223.777 C 328.796 223.621,329.057 223.564,329.278 223.649 C 329.500 223.734,329.769 223.664,329.875 223.492 C 329.995 223.298,329.866 223.244,329.536 223.349 C 329.033 223.507,329.032 223.493,329.516 223.095 C 329.797 222.862,329.941 222.586,329.836 222.480 C 329.608 222.253,329.167 222.225,329.114 222.435 M325.267 224.621 C 325.537 224.787,325.377 224.917,324.747 225.043 C 324.247 225.143,323.838 225.388,323.838 225.587 C 323.838 225.854,323.924 225.862,324.169 225.617 C 324.351 225.435,324.658 225.347,324.852 225.421 C 325.045 225.495,325.423 225.313,325.691 225.017 C 326.149 224.511,326.139 224.475,325.528 224.429 C 325.083 224.396,325.001 224.456,325.267 224.621 M319.810 228.429 C 319.633 228.543,319.582 228.891,319.695 229.209 C 319.885 229.740,319.915 229.729,320.086 229.075 C 320.300 228.256,320.253 228.145,319.810 228.429 M316.646 229.520 C 316.882 230.134,317.639 230.077,317.634 229.446 C 317.630 229.005,317.588 228.994,317.343 229.373 C 317.152 229.668,317.056 229.692,317.052 229.446 C 317.050 229.244,316.919 229.077,316.762 229.077 C 316.605 229.077,316.553 229.277,316.646 229.520 M312.887 230.494 C 312.491 230.956,312.513 231.074,313.099 231.653 C 314.022 232.564,314.586 231.898,313.846 230.769 C 313.359 230.028,313.300 230.011,312.887 230.494 M314.391 230.917 C 314.391 231.047,314.784 231.123,315.264 231.087 C 315.744 231.050,316.075 230.959,316.000 230.883 C 315.760 230.643,314.391 230.672,314.391 230.917 M310.648 232.435 C 310.544 232.618,310.567 232.670,310.698 232.551 C 310.830 232.431,311.113 232.564,311.327 232.846 C 311.694 233.329,311.716 233.328,311.725 232.824 C 311.730 232.530,311.867 232.372,312.030 232.472 C 312.192 232.573,312.325 232.531,312.325 232.379 C 312.325 231.987,310.876 232.036,310.648 232.435 M310.331 233.282 C 310.380 233.429,310.547 233.550,310.701 233.550 C 310.855 233.550,311.022 233.429,311.071 233.282 C 311.120 233.134,310.954 233.014,310.701 233.014 C 310.449 233.014,310.282 233.134,310.331 233.282 M309.775 234.244 C 309.880 234.518,309.773 234.686,309.494 234.686 C 309.246 234.686,309.129 234.826,309.234 234.996 C 309.365 235.207,309.557 235.196,309.842 234.960 C 310.337 234.549,310.395 233.801,309.932 233.801 C 309.752 233.801,309.681 234.000,309.775 234.244 M306.628 235.857 C 306.798 236.508,307.627 236.164,307.578 235.462 C 307.564 235.264,307.493 235.284,307.402 235.510 C 307.289 235.792,307.147 235.807,306.858 235.567 C 306.550 235.312,306.501 235.373,306.628 235.857 M303.494 236.442 C 303.215 236.614,303.188 236.831,303.399 237.208 C 303.674 237.699,303.714 237.693,304.024 237.113 C 304.390 236.430,304.102 236.066,303.494 236.442 M300.685 238.207 C 300.195 238.718,300.035 239.107,300.202 239.378 C 300.396 239.692,300.497 239.642,300.652 239.153 C 300.762 238.807,300.992 238.524,301.163 238.524 C 301.357 238.524,301.335 238.692,301.107 238.967 C 300.895 239.222,300.866 239.410,301.039 239.410 C 301.471 239.410,301.701 238.646,301.370 238.315 C 301.191 238.136,301.443 238.064,302.057 238.119 C 302.590 238.166,302.792 238.133,302.506 238.047 C 302.219 237.960,302.048 237.788,302.124 237.665 C 302.475 237.097,301.338 237.525,300.685 238.207 M296.089 242.049 C 296.089 242.560,296.608 242.655,296.977 242.211 C 297.280 241.845,297.237 241.771,296.715 241.771 C 296.371 241.771,296.089 241.896,296.089 242.049 M293.943 242.820 C 293.614 243.261,293.232 243.461,292.910 243.361 C 292.430 243.212,292.430 243.223,292.913 243.534 C 293.470 243.892,294.786 243.001,294.571 242.411 C 294.513 242.252,294.230 242.436,293.943 242.820 M289.966 244.187 C 289.910 244.934,289.905 244.938,289.004 245.063 C 288.087 245.191,287.431 245.792,287.317 246.609 C 287.250 247.091,287.293 247.135,287.507 246.804 C 287.659 246.568,287.718 246.269,287.638 246.140 C 287.558 246.010,287.634 245.904,287.805 245.904 C 287.977 245.904,288.118 246.033,288.118 246.190 C 288.118 246.347,288.309 246.403,288.542 246.313 C 288.776 246.224,288.898 245.972,288.814 245.754 C 288.713 245.490,288.942 245.325,289.497 245.262 C 289.956 245.209,290.332 245.011,290.332 244.822 C 290.332 244.632,290.453 244.367,290.601 244.231 C 290.760 244.086,290.771 244.154,290.629 244.400 C 290.456 244.699,290.497 244.747,290.779 244.573 C 291.073 244.391,291.117 244.471,290.955 244.896 C 290.791 245.328,290.822 245.380,291.087 245.117 C 291.352 244.854,291.339 244.646,291.030 244.232 C 290.475 243.485,290.021 243.466,289.966 244.187 M281.328 249.559 C 281.328 249.803,281.175 250.097,280.988 250.213 C 280.756 250.356,280.727 250.290,280.897 250.009 C 281.105 249.663,281.068 249.658,280.676 249.975 C 280.291 250.287,280.180 250.287,280.069 249.975 C 279.994 249.766,279.859 249.661,279.769 249.742 C 279.426 250.052,280.377 250.929,280.856 250.745 C 281.508 250.495,282.015 249.541,281.624 249.299 C 281.462 249.199,281.328 249.316,281.328 249.559 M277.196 250.403 C 277.196 250.624,277.362 250.983,277.565 251.202 C 277.863 251.524,277.854 251.554,277.514 251.360 C 277.200 251.181,277.144 251.248,277.290 251.627 C 277.397 251.906,277.380 252.069,277.252 251.991 C 277.124 251.912,276.827 251.969,276.591 252.118 C 276.254 252.331,276.301 252.390,276.809 252.394 C 277.165 252.396,277.539 252.264,277.641 252.099 C 277.743 251.933,277.973 251.889,278.152 251.999 C 278.363 252.130,278.408 252.022,278.281 251.690 C 278.124 251.282,278.203 251.217,278.673 251.366 C 279.010 251.473,279.262 251.418,279.262 251.238 C 279.262 251.064,279.162 250.938,279.041 250.957 C 278.277 251.078,277.939 250.910,278.376 250.627 C 278.620 250.470,278.680 250.339,278.509 250.337 C 278.339 250.334,278.020 250.498,277.802 250.701 C 277.534 250.950,277.468 250.957,277.600 250.722 C 277.708 250.530,277.661 250.289,277.496 250.187 C 277.331 250.085,277.196 250.183,277.196 250.403 M274.115 254.444 C 273.621 254.989,273.624 255.008,274.167 254.866 C 274.480 254.784,274.736 254.527,274.736 254.296 C 274.736 253.762,274.731 253.763,274.115 254.444 M271.724 254.733 C 271.917 255.054,271.829 255.110,271.337 254.982 C 270.987 254.890,270.775 254.936,270.866 255.083 C 270.957 255.230,270.890 255.351,270.719 255.351 C 270.547 255.351,270.406 255.616,270.406 255.941 C 270.406 256.266,270.572 256.529,270.775 256.527 C 271.360 256.520,272.035 255.996,271.784 255.744 C 271.658 255.618,271.446 255.692,271.312 255.907 C 271.156 256.160,271.003 256.191,270.881 255.994 C 270.672 255.655,271.779 255.186,272.472 255.321 C 272.716 255.368,272.849 255.356,272.768 255.295 C 271.473 254.316,271.473 254.316,271.724 254.733 M268.164 256.418 C 268.366 256.943,268.005 257.162,267.555 256.788 C 267.249 256.534,267.159 256.576,267.159 256.972 C 267.159 257.356,266.978 257.451,266.448 257.350 C 265.938 257.253,265.780 257.327,265.889 257.611 C 265.973 257.829,265.894 258.007,265.714 258.007 C 265.535 258.007,265.387 257.879,265.387 257.721 C 265.387 257.564,265.185 257.513,264.937 257.608 C 264.592 257.741,264.565 257.875,264.823 258.186 C 265.008 258.409,265.275 258.519,265.418 258.432 C 265.560 258.344,265.597 258.478,265.500 258.730 C 265.403 258.982,265.184 259.188,265.011 259.188 C 264.839 259.188,264.786 259.275,264.893 259.382 C 264.999 259.489,265.406 259.231,265.796 258.810 C 266.187 258.389,266.432 257.969,266.340 257.878 C 266.249 257.787,266.462 257.712,266.814 257.712 C 267.166 257.712,267.454 257.584,267.454 257.426 C 267.454 257.269,267.640 257.212,267.867 257.299 C 268.094 257.386,268.369 257.313,268.478 257.137 C 268.586 256.961,268.799 256.893,268.950 256.987 C 269.101 257.080,269.225 256.891,269.225 256.567 C 269.225 256.157,269.043 255.991,268.627 256.023 C 268.299 256.047,268.090 256.225,268.164 256.418 M261.493 261.181 C 261.249 261.465,260.952 261.897,260.834 262.140 C 260.716 262.384,260.892 262.274,261.225 261.895 C 261.558 261.517,262.199 261.097,262.649 260.961 L 263.469 260.715 262.703 260.690 C 262.281 260.676,261.737 260.897,261.493 261.181 M258.898 262.063 C 258.044 262.399,257.772 262.868,258.201 263.269 C 258.530 263.576,258.653 263.509,258.886 262.897 C 259.064 262.427,259.325 262.211,259.592 262.314 C 259.824 262.403,260.102 262.334,260.209 262.160 C 260.416 261.826,259.648 261.769,258.898 262.063 M256.431 262.945 C 255.599 263.069,256.062 263.882,256.974 263.898 C 257.137 263.900,257.070 263.774,256.827 263.616 C 256.448 263.372,256.459 263.329,256.900 263.326 C 257.185 263.323,257.417 263.188,257.417 263.026 C 257.417 262.863,257.384 262.751,257.343 262.775 C 257.303 262.799,256.892 262.876,256.431 262.945 M255.634 263.764 C 255.602 263.926,255.601 264.192,255.632 264.354 C 255.663 264.517,255.519 264.483,255.313 264.280 C 254.880 263.856,254.349 263.780,254.596 264.179 C 254.687 264.326,254.495 264.377,254.170 264.292 C 253.845 264.207,253.579 264.271,253.579 264.433 C 253.579 264.890,254.997 265.052,255.538 264.657 C 255.805 264.462,255.948 264.115,255.857 263.886 C 255.767 263.656,255.666 263.601,255.634 263.764 M251.993 265.918 C 251.913 266.048,251.969 266.347,252.118 266.582 C 252.341 266.935,252.390 266.916,252.394 266.477 C 252.397 266.149,252.530 266.024,252.739 266.154 C 252.950 266.284,253.000 266.235,252.870 266.023 C 252.626 265.629,252.203 265.578,251.993 265.918 M249.299 267.749 C 248.780 267.972,248.808 268.005,249.538 268.024 C 250.020 268.036,250.291 267.921,250.185 267.749 C 250.084 267.587,249.977 267.463,249.946 267.475 C 249.915 267.486,249.624 267.610,249.299 267.749 M248.155 268.280 C 247.829 268.808,248.454 269.267,248.850 268.790 C 249.180 268.392,249.159 268.355,248.702 268.530 C 248.335 268.671,248.235 268.627,248.382 268.390 C 248.500 268.200,248.529 268.044,248.448 268.044 C 248.367 268.044,248.235 268.150,248.155 268.280 M245.688 269.335 C 245.590 269.495,245.681 269.511,245.904 269.373 C 246.169 269.209,246.220 269.249,246.064 269.500 C 245.939 269.702,245.554 269.796,245.207 269.708 C 244.631 269.564,244.620 269.583,245.088 269.933 C 245.369 270.144,245.502 270.421,245.383 270.548 C 245.264 270.675,245.465 270.596,245.830 270.374 C 246.196 270.151,246.494 269.794,246.494 269.579 C 246.494 269.365,246.627 269.272,246.790 269.373 C 246.952 269.473,247.085 269.423,247.085 269.261 C 247.085 268.896,245.922 268.957,245.688 269.335 M242.030 269.946 C 242.009 270.036,241.974 270.210,241.951 270.332 C 241.928 270.454,241.799 270.728,241.663 270.942 C 241.528 271.156,241.481 271.395,241.559 271.473 C 241.736 271.650,242.657 270.752,242.657 270.402 C 242.657 270.110,242.086 269.694,242.030 269.946 M242.952 270.406 C 242.952 270.969,242.861 271.146,242.391 271.489 C 242.132 271.678,242.013 271.927,242.127 272.041 C 242.240 272.154,242.567 272.014,242.852 271.729 C 243.439 271.142,243.690 270.111,243.245 270.111 C 243.084 270.111,242.952 270.244,242.952 270.406 M236.162 274.584 C 236.162 274.741,236.016 274.779,235.838 274.668 C 235.610 274.527,235.613 274.654,235.848 275.094 C 236.032 275.438,236.112 275.736,236.025 275.756 C 235.938 275.777,235.745 275.810,235.597 275.830 C 235.038 275.906,235.029 276.188,235.585 276.230 C 235.902 276.254,236.162 276.149,236.162 275.996 C 236.162 275.844,236.162 275.653,236.162 275.572 C 236.162 275.491,236.492 275.325,236.895 275.203 L 237.628 274.982 236.895 274.640 C 236.463 274.439,236.162 274.416,236.162 274.584 M233.652 276.314 C 233.548 276.641,233.338 276.831,233.184 276.737 C 233.031 276.642,232.984 276.407,233.080 276.216 C 233.176 276.024,233.067 276.095,232.838 276.373 C 232.552 276.722,232.327 276.785,232.117 276.575 C 231.908 276.365,231.770 276.392,231.677 276.659 C 231.602 276.873,231.784 277.280,232.080 277.565 C 232.596 278.058,232.620 278.053,232.620 277.459 C 232.620 277.007,232.751 276.887,233.098 277.021 C 233.491 277.172,234.686 276.270,234.686 275.822 C 234.686 275.419,233.802 275.840,233.652 276.314 M229.373 277.491 C 229.129 277.648,229.012 277.779,229.112 277.781 C 229.212 277.784,229.196 278.319,229.077 278.971 C 228.895 279.964,228.926 280.100,229.271 279.814 C 229.497 279.627,229.615 279.405,229.532 279.323 C 229.449 279.240,229.612 278.984,229.894 278.753 C 230.175 278.522,230.249 278.411,230.057 278.507 C 229.866 278.603,229.613 278.527,229.497 278.338 C 229.349 278.100,229.519 278.040,230.054 278.143 C 230.728 278.271,230.787 278.222,230.530 277.743 C 230.200 277.125,230.005 277.082,229.373 277.491 M223.387 281.922 C 222.812 282.593,222.713 283.395,223.205 283.395 C 223.385 283.395,223.453 283.189,223.356 282.937 C 223.255 282.674,223.305 282.555,223.472 282.659 C 223.633 282.758,223.764 282.699,223.764 282.527 C 223.764 282.355,224.022 282.214,224.337 282.214 C 224.652 282.214,224.987 282.089,225.081 281.937 C 225.178 281.780,224.920 281.721,224.484 281.800 C 224.002 281.887,223.787 281.826,223.905 281.634 C 224.217 281.128,223.929 281.289,223.387 281.922 M219.664 283.723 C 218.882 284.356,218.872 284.565,219.631 284.366 C 220.005 284.268,220.228 284.360,220.240 284.615 C 220.250 284.837,220.379 284.720,220.526 284.354 C 220.766 283.756,221.511 283.493,222.435 283.680 C 222.598 283.712,222.620 283.629,222.484 283.493 C 222.050 283.060,220.308 283.201,219.664 283.723 M217.565 285.036 C 217.565 285.464,217.437 285.712,217.269 285.609 C 217.107 285.509,216.974 285.575,216.974 285.756 C 216.974 285.938,216.841 286.004,216.679 285.904 C 216.517 285.804,216.384 285.928,216.384 286.179 C 216.384 286.431,216.118 286.803,215.793 287.006 C 215.469 287.209,215.203 287.501,215.203 287.657 C 215.203 287.812,215.641 287.514,216.176 286.995 C 216.712 286.476,217.295 286.052,217.471 286.052 C 217.648 286.052,217.851 285.653,217.923 285.166 C 217.994 284.679,217.943 284.280,217.809 284.280 C 217.674 284.280,217.565 284.620,217.565 285.036 M212.650 288.461 C 212.251 288.903,212.078 288.934,211.707 288.634 C 211.404 288.388,211.321 288.380,211.458 288.609 C 211.571 288.799,211.497 289.021,211.293 289.103 C 211.089 289.185,211.199 289.263,211.538 289.276 C 211.876 289.288,212.252 289.199,212.374 289.077 C 212.496 288.956,212.684 288.845,212.792 288.831 C 213.248 288.772,214.022 288.334,214.022 288.136 C 214.022 287.718,213.132 287.929,212.650 288.461 M209.753 288.985 C 209.634 289.177,209.762 289.219,210.095 289.098 C 210.600 288.914,210.601 288.934,210.121 289.482 C 209.642 290.029,209.643 290.063,210.144 290.100 C 210.511 290.128,210.659 289.949,210.627 289.515 C 210.576 288.824,210.050 288.504,209.753 288.985 M206.409 290.066 C 206.094 290.408,206.119 290.481,206.557 290.489 C 207.056 290.498,207.057 290.520,206.573 290.887 C 206.083 291.260,206.153 291.661,206.709 291.661 C 206.854 291.661,206.888 291.494,206.785 291.292 C 206.682 291.089,206.797 291.166,207.040 291.463 C 207.465 291.985,207.493 291.982,207.810 291.390 C 207.991 291.052,208.433 290.766,208.793 290.754 C 209.417 290.734,209.420 290.723,208.856 290.499 C 208.523 290.367,208.186 290.389,208.083 290.549 C 207.980 290.708,207.655 290.573,207.345 290.243 C 206.872 289.741,206.733 289.715,206.409 290.066 M204.934 291.587 C 204.968 291.708,204.831 292.107,204.628 292.472 C 204.425 292.838,204.382 293.137,204.531 293.137 C 204.680 293.137,204.872 292.870,204.957 292.545 C 205.070 292.113,205.258 292.009,205.655 292.159 C 206.165 292.352,206.168 292.334,205.704 291.865 C 205.184 291.341,204.827 291.212,204.934 291.587 " stroke="none" fill="#d82c1c" fill-rule="evenodd"></path><path id="path1" d="M199.291 0.514 C 199.042 0.780,198.515 0.897,197.896 0.825 C 197.326 0.759,196.898 0.841,196.896 1.019 C 196.893 1.189,196.763 1.129,196.605 0.886 C 196.304 0.420,196.168 0.766,196.287 1.693 C 196.314 1.906,196.146 1.985,195.879 1.883 C 195.629 1.787,195.424 1.855,195.424 2.035 C 195.424 2.215,195.100 2.362,194.704 2.362 C 194.307 2.362,193.888 2.515,193.773 2.702 C 193.630 2.934,193.695 2.963,193.977 2.793 C 194.320 2.587,194.326 2.623,194.016 3.007 C 193.671 3.433,192.068 3.981,191.491 3.870 C 191.357 3.844,191.303 3.926,191.370 4.052 C 191.438 4.178,191.225 4.536,190.898 4.848 C 190.396 5.327,190.333 5.338,190.496 4.915 C 190.656 4.496,190.594 4.464,190.116 4.720 C 189.802 4.889,189.373 4.991,189.163 4.949 C 188.954 4.906,188.798 5.086,188.817 5.350 C 188.840 5.665,188.678 5.783,188.341 5.695 C 187.994 5.604,187.773 5.780,187.652 6.244 C 187.510 6.785,187.398 6.852,187.109 6.563 C 186.606 6.060,186.174 6.107,186.380 6.642 C 186.485 6.917,186.378 7.085,186.099 7.085 C 185.851 7.085,185.721 7.204,185.811 7.349 C 185.901 7.494,185.776 7.690,185.533 7.783 C 185.291 7.876,185.092 7.836,185.092 7.694 C 185.092 7.552,184.824 7.506,184.496 7.591 C 184.027 7.714,183.971 7.835,184.237 8.154 C 184.507 8.480,184.435 8.562,183.874 8.565 C 183.300 8.569,183.253 8.626,183.616 8.880 C 183.967 9.125,183.926 9.153,183.420 9.011 C 183.068 8.913,182.695 8.970,182.590 9.139 C 182.486 9.308,182.242 9.444,182.049 9.442 C 181.838 9.439,181.874 9.323,182.140 9.151 C 182.407 8.979,182.443 8.863,182.231 8.861 C 182.037 8.858,181.693 9.121,181.466 9.445 C 181.240 9.768,180.945 9.934,180.812 9.814 C 180.679 9.693,180.644 9.802,180.734 10.055 C 180.864 10.420,180.721 10.490,180.054 10.392 C 179.092 10.251,178.150 10.984,178.412 11.668 C 178.504 11.907,178.462 12.103,178.318 12.103 C 178.174 12.103,178.005 11.948,177.942 11.759 C 177.872 11.549,177.558 11.692,177.136 12.128 C 176.636 12.643,176.495 12.698,176.626 12.325 C 176.726 12.041,176.679 11.808,176.522 11.808 C 176.365 11.808,176.236 11.998,176.236 12.231 C 176.236 12.464,175.970 12.738,175.646 12.841 C 175.321 12.944,175.055 13.140,175.055 13.276 C 175.055 13.413,174.756 13.459,174.391 13.378 C 173.878 13.266,173.824 13.301,174.154 13.533 C 174.504 13.780,174.439 13.899,173.795 14.193 C 173.362 14.390,173.072 14.655,173.150 14.782 C 173.229 14.909,172.880 14.961,172.375 14.897 C 171.636 14.804,171.492 14.871,171.636 15.246 C 171.760 15.569,171.684 15.661,171.389 15.548 C 171.101 15.438,170.995 15.551,171.062 15.900 C 171.141 16.308,170.937 16.424,170.082 16.460 C 169.230 16.495,169.128 16.450,169.594 16.244 C 169.929 16.095,170.008 15.973,169.776 15.962 C 169.373 15.941,167.933 17.281,168.138 17.486 C 168.196 17.544,167.783 17.537,167.221 17.472 C 166.648 17.405,166.199 17.484,166.199 17.652 C 166.199 17.817,166.432 17.917,166.716 17.875 C 167.000 17.832,167.065 17.854,166.860 17.924 C 166.655 17.995,166.571 18.188,166.674 18.354 C 166.794 18.549,166.650 18.544,166.269 18.340 C 165.787 18.082,165.684 18.112,165.717 18.500 C 165.739 18.762,165.572 19.042,165.346 19.121 C 165.121 19.200,165.017 19.134,165.116 18.974 C 165.223 18.802,165.007 18.738,164.588 18.818 C 164.134 18.905,163.936 19.101,164.037 19.364 C 164.123 19.589,163.982 19.855,163.722 19.955 C 163.463 20.054,163.342 20.288,163.453 20.474 C 163.565 20.660,163.431 20.629,163.156 20.407 C 162.865 20.170,162.657 20.131,162.657 20.313 C 162.657 20.485,162.343 20.568,161.960 20.499 C 161.502 20.416,160.994 20.622,160.477 21.101 C 160.045 21.502,159.627 21.833,159.550 21.837 C 159.473 21.842,159.215 21.845,158.976 21.845 C 158.693 21.845,158.608 22.015,158.731 22.336 C 158.852 22.652,158.804 22.756,158.595 22.627 C 158.413 22.515,158.186 22.694,158.078 23.037 C 157.920 23.535,157.804 23.581,157.451 23.288 C 157.097 22.995,156.989 23.040,156.860 23.533 C 156.750 23.955,156.531 24.093,156.137 23.990 C 155.765 23.893,155.572 23.995,155.572 24.288 C 155.572 24.533,155.366 24.813,155.114 24.910 C 154.851 25.010,154.733 24.961,154.836 24.794 C 154.937 24.630,154.678 24.502,154.244 24.502 C 153.729 24.502,153.542 24.617,153.684 24.847 C 153.829 25.081,153.735 25.130,153.395 25.000 C 153.028 24.859,152.915 24.943,152.977 25.312 C 153.062 25.812,152.952 25.865,151.661 25.945 C 151.119 25.979,151.078 26.040,151.439 26.273 C 151.734 26.464,151.759 26.561,151.513 26.564 C 151.310 26.566,151.140 26.801,151.135 27.085 C 151.126 27.573,151.109 27.573,150.822 27.079 C 150.465 26.467,149.909 26.675,150.159 27.326 C 150.296 27.682,150.133 27.742,149.334 27.627 C 148.787 27.548,148.515 27.557,148.730 27.648 C 149.023 27.771,148.954 27.990,148.457 28.519 C 147.838 29.178,146.482 29.547,146.846 28.957 C 146.937 28.810,146.751 28.758,146.432 28.841 C 146.112 28.925,145.879 29.079,145.912 29.183 C 146.037 29.572,144.885 30.852,144.743 30.482 C 144.644 30.226,144.443 30.201,144.074 30.398 C 143.784 30.553,143.455 30.589,143.344 30.478 C 143.233 30.367,143.239 30.528,143.357 30.835 C 143.526 31.277,143.468 31.354,143.077 31.204 C 142.752 31.080,142.583 31.165,142.583 31.454 C 142.583 31.779,142.372 31.847,141.771 31.716 C 141.146 31.580,141.061 31.611,141.402 31.854 C 141.764 32.111,141.710 32.170,141.107 32.177 C 140.701 32.182,140.170 32.326,139.926 32.496 C 139.588 32.733,139.654 32.758,140.208 32.600 C 140.857 32.416,140.885 32.441,140.481 32.845 C 140.199 33.127,139.707 33.244,139.166 33.156 C 138.498 33.048,138.403 33.088,138.745 33.330 C 139.128 33.601,139.117 33.645,138.672 33.649 C 138.220 33.653,138.034 33.956,138.106 34.572 C 138.118 34.671,137.835 34.730,137.477 34.702 C 137.119 34.675,136.635 34.793,136.401 34.964 C 136.082 35.198,136.031 35.184,136.197 34.908 C 136.319 34.705,136.278 34.539,136.106 34.539 C 135.934 34.539,135.791 34.771,135.789 35.055 C 135.785 35.499,135.742 35.509,135.485 35.129 C 135.264 34.803,135.236 34.907,135.380 35.523 C 135.545 36.231,135.489 36.346,135.020 36.269 C 134.715 36.218,134.278 36.294,134.050 36.437 C 133.766 36.615,133.702 36.589,133.846 36.356 C 133.971 36.154,133.869 36.015,133.597 36.015 C 133.193 36.015,132.994 36.379,133.210 36.722 C 133.505 37.188,132.121 38.017,131.465 37.768 C 130.532 37.413,130.401 37.419,130.640 37.806 C 130.748 37.981,130.547 38.196,130.189 38.290 C 129.772 38.399,129.666 38.533,129.889 38.671 C 130.132 38.822,130.096 38.937,129.766 39.064 C 129.509 39.163,129.299 39.115,129.299 38.958 C 129.299 38.800,129.166 38.672,129.004 38.672 C 128.841 38.672,128.730 38.771,128.755 38.893 C 128.864 39.405,128.333 40.098,127.946 39.950 C 127.716 39.861,127.528 39.945,127.528 40.136 C 127.528 40.355,127.297 40.409,126.900 40.283 C 126.421 40.131,126.330 40.179,126.514 40.485 C 126.713 40.816,126.674 40.819,126.286 40.505 C 125.883 40.179,125.761 40.249,125.432 40.993 C 125.173 41.577,124.873 41.828,124.516 41.760 C 124.224 41.704,123.985 41.774,123.985 41.916 C 123.985 42.058,123.718 42.259,123.391 42.363 C 123.063 42.467,122.872 42.675,122.965 42.826 C 123.135 43.100,122.536 43.234,121.533 43.147 C 121.239 43.121,121.081 43.233,121.181 43.395 C 121.281 43.557,121.223 43.690,121.051 43.690 C 120.879 43.690,120.738 43.549,120.738 43.377 C 120.738 43.205,120.605 43.147,120.443 43.247 C 120.280 43.348,120.148 43.675,120.148 43.975 C 120.148 44.388,119.993 44.480,119.511 44.354 C 119.121 44.252,118.946 44.303,119.059 44.487 C 119.173 44.670,118.959 44.731,118.503 44.644 C 118.008 44.549,117.790 44.625,117.848 44.869 C 117.895 45.071,117.469 45.399,116.900 45.597 C 116.332 45.795,115.867 46.104,115.867 46.285 C 115.867 46.465,115.682 46.785,115.455 46.996 C 115.114 47.313,115.084 47.308,115.279 46.965 C 115.438 46.688,115.403 46.620,115.175 46.761 C 114.987 46.877,114.823 47.197,114.811 47.471 C 114.796 47.779,114.730 47.829,114.638 47.601 C 114.557 47.399,114.268 47.235,113.998 47.237 C 113.572 47.241,113.565 47.280,113.948 47.528 C 114.327 47.772,114.316 47.814,113.875 47.818 C 113.590 47.821,113.347 47.657,113.335 47.454 C 113.322 47.251,113.169 47.483,112.995 47.970 C 112.821 48.458,112.533 48.954,112.354 49.073 C 111.865 49.400,110.639 49.343,110.849 49.004 C 110.949 48.841,110.875 48.708,110.684 48.708 C 110.477 48.708,110.402 48.958,110.499 49.328 C 110.588 49.669,110.588 49.874,110.498 49.785 C 110.409 49.695,110.155 49.803,109.933 50.025 C 109.712 50.246,109.296 50.370,109.009 50.300 C 108.667 50.217,108.258 50.505,107.823 51.134 C 107.376 51.780,107.159 51.930,107.159 51.592 C 107.159 51.254,107.005 51.148,106.691 51.268 C 106.314 51.413,106.300 51.497,106.617 51.701 C 106.851 51.852,106.603 51.876,106.006 51.762 C 105.282 51.622,105.060 51.664,105.211 51.910 C 105.327 52.097,105.282 52.251,105.110 52.251 C 104.938 52.251,104.830 52.406,104.871 52.595 C 104.915 52.804,104.503 52.960,103.826 52.991 C 103.210 53.019,102.546 53.214,102.350 53.425 C 102.062 53.733,102.127 53.775,102.684 53.640 C 103.324 53.485,103.341 53.511,102.913 53.984 C 102.589 54.342,102.138 54.459,101.409 54.374 C 100.600 54.280,100.369 54.358,100.369 54.728 C 100.369 54.989,100.240 55.203,100.083 55.203 C 99.926 55.203,99.867 55.385,99.952 55.607 C 100.113 56.027,99.287 56.372,98.104 56.380 C 97.751 56.382,97.068 56.716,96.585 57.122 C 96.103 57.528,95.547 57.860,95.350 57.860 C 95.148 57.860,95.069 58.059,95.168 58.318 C 95.269 58.581,95.219 58.699,95.052 58.596 C 94.564 58.294,94.724 57.855,95.424 57.574 C 95.857 57.400,95.924 57.300,95.618 57.288 C 95.117 57.268,94.211 58.108,94.213 58.590 C 94.214 58.749,94.038 58.925,93.823 58.982 C 93.564 59.051,93.581 58.980,93.875 58.772 C 94.141 58.584,94.179 58.457,93.969 58.455 C 93.778 58.452,93.422 58.649,93.179 58.893 C 92.655 59.417,92.274 59.481,92.574 58.995 C 92.705 58.783,92.655 58.734,92.442 58.866 C 92.253 58.983,92.161 59.424,92.238 59.846 C 92.344 60.429,92.295 60.531,92.033 60.270 C 91.651 59.887,90.903 59.803,90.957 60.148 C 91.051 60.740,90.878 60.848,90.423 60.479 C 90.084 60.204,89.995 60.192,90.145 60.443 C 90.294 60.690,90.167 60.812,89.759 60.812 C 89.234 60.812,89.039 61.075,89.095 61.709 C 89.103 61.796,88.780 61.895,88.376 61.928 C 87.861 61.971,87.708 61.880,87.863 61.622 C 88.011 61.376,87.919 61.389,87.584 61.660 C 87.310 61.883,87.087 62.215,87.089 62.398 C 87.092 62.581,87.223 62.531,87.380 62.288 C 87.537 62.044,87.668 61.995,87.671 62.178 C 87.677 62.613,86.830 63.312,86.588 63.070 C 86.485 62.968,86.223 63.031,86.005 63.212 C 85.714 63.454,85.609 63.453,85.609 63.210 C 85.609 63.027,85.476 62.878,85.314 62.878 C 85.151 62.878,85.018 63.128,85.018 63.432 C 85.018 63.737,84.786 64.169,84.502 64.392 C 84.034 64.759,84.023 64.749,84.390 64.280 C 85.011 63.489,84.327 63.667,83.544 64.501 C 83.163 64.906,82.801 65.187,82.739 65.125 C 82.505 64.892,79.870 66.076,79.767 66.461 C 79.677 66.799,79.705 66.799,79.941 66.463 C 80.114 66.216,80.291 66.176,80.404 66.358 C 80.505 66.521,80.380 66.733,80.127 66.830 C 79.870 66.929,79.761 67.158,79.879 67.350 C 80.000 67.546,79.963 67.614,79.792 67.508 C 79.628 67.406,79.076 67.443,78.566 67.589 C 77.903 67.780,77.628 67.756,77.603 67.507 C 77.584 67.315,77.485 67.546,77.382 68.020 C 77.210 68.816,75.867 69.448,75.867 68.733 C 75.867 68.598,75.676 68.487,75.441 68.487 C 75.179 68.487,75.058 68.707,75.126 69.060 C 75.203 69.461,75.109 69.585,74.814 69.472 C 74.563 69.376,74.391 69.489,74.391 69.751 C 74.391 70.022,73.993 70.267,73.362 70.386 C 72.788 70.493,72.195 70.835,72.023 71.157 C 71.853 71.474,71.578 71.734,71.411 71.734 C 71.245 71.734,71.206 71.568,71.325 71.365 C 71.444 71.162,71.275 71.229,70.950 71.513 C 70.625 71.797,70.237 72.027,70.087 72.025 C 69.938 72.023,70.015 71.892,70.258 71.734 C 70.643 71.486,70.637 71.448,70.216 71.444 C 69.949 71.441,69.655 71.638,69.561 71.882 C 69.468 72.125,69.520 72.325,69.677 72.325 C 69.834 72.325,69.963 72.465,69.963 72.637 C 69.963 72.809,69.839 72.874,69.688 72.780 C 69.537 72.687,69.321 72.759,69.209 72.942 C 69.065 73.174,68.945 73.179,68.809 72.958 C 68.701 72.784,68.308 72.722,67.935 72.820 C 67.427 72.952,67.356 73.060,67.650 73.247 C 67.969 73.449,67.971 73.497,67.658 73.501 C 67.445 73.504,67.354 73.638,67.454 73.801 C 67.554 73.963,67.496 74.096,67.324 74.096 C 67.152 74.096,67.011 73.963,67.011 73.801 C 67.011 73.638,66.869 73.506,66.696 73.506 C 66.515 73.506,66.461 73.757,66.568 74.096 C 66.703 74.521,66.621 74.686,66.276 74.686 C 66.011 74.686,65.877 74.555,65.976 74.395 C 66.084 74.220,65.943 74.181,65.624 74.299 C 64.632 74.664,63.764 75.343,63.764 75.754 C 63.764 75.978,63.631 76.162,63.469 76.162 C 63.306 76.162,63.173 76.042,63.173 75.895 C 63.173 75.748,62.908 75.697,62.583 75.782 C 62.258 75.867,61.993 76.178,61.993 76.475 C 61.993 76.771,61.839 77.108,61.652 77.224 C 61.463 77.340,61.390 77.306,61.489 77.147 C 61.596 76.973,61.294 76.917,60.722 77.006 C 59.803 77.149,59.798 77.158,60.517 77.366 C 61.318 77.598,61.306 77.618,60.250 77.813 C 59.860 77.885,59.373 78.174,59.167 78.455 C 58.962 78.736,58.694 78.866,58.573 78.745 C 58.451 78.623,58.507 78.524,58.696 78.524 C 58.886 78.524,59.041 78.365,59.041 78.170 C 59.041 77.894,58.962 77.894,58.686 78.170 C 58.492 78.365,58.088 78.524,57.790 78.524 C 57.323 78.524,57.296 78.615,57.594 79.188 C 57.784 79.554,57.838 79.757,57.713 79.641 C 57.589 79.525,57.209 79.625,56.870 79.863 C 56.530 80.101,56.116 80.293,55.949 80.291 C 55.782 80.288,55.845 80.143,56.089 79.968 C 56.457 79.703,56.440 79.679,55.991 79.825 C 55.693 79.921,55.228 80.002,54.957 80.005 C 54.528 80.008,54.522 80.050,54.908 80.325 C 55.263 80.579,55.220 80.613,54.686 80.496 C 53.946 80.334,53.834 80.578,54.391 81.139 C 54.687 81.438,54.596 81.482,53.930 81.362 C 53.060 81.206,52.003 81.467,51.973 81.845 C 51.964 81.967,51.956 82.250,51.956 82.475 C 51.956 82.699,51.690 82.953,51.365 83.038 C 51.041 83.122,50.775 83.072,50.775 82.924 C 50.775 82.777,50.646 82.657,50.489 82.657 C 50.332 82.657,50.279 82.856,50.373 83.100 C 50.503 83.438,50.313 83.542,49.569 83.542 C 48.639 83.542,48.621 83.563,49.169 84.004 C 49.535 84.299,49.582 84.420,49.299 84.339 C 49.055 84.269,48.608 84.341,48.304 84.497 C 47.916 84.697,47.811 84.686,47.952 84.457 C 48.065 84.274,47.952 84.133,47.693 84.133 C 47.440 84.133,47.232 84.266,47.232 84.428 C 47.232 84.590,47.049 84.723,46.826 84.723 C 46.602 84.723,46.254 84.923,46.052 85.166 C 45.850 85.410,45.402 85.622,45.056 85.638 C 44.492 85.665,44.503 85.692,45.166 85.904 C 45.662 86.063,45.734 86.150,45.386 86.170 C 45.100 86.186,44.582 86.527,44.234 86.927 C 43.677 87.568,42.857 87.716,43.233 87.107 C 43.312 86.979,43.041 86.939,42.631 87.018 C 42.161 87.107,41.941 87.307,42.036 87.556 C 42.120 87.774,42.041 88.043,41.860 88.154 C 41.662 88.277,41.615 88.222,41.743 88.016 C 42.148 87.361,41.346 87.682,40.565 88.487 C 40.132 88.934,39.869 89.133,39.980 88.930 C 40.100 88.711,40.008 88.561,39.754 88.561 C 39.219 88.561,38.882 89.359,39.306 89.622 C 39.865 89.967,38.892 90.313,38.281 89.986 C 37.858 89.760,37.645 89.784,37.458 90.080 C 37.319 90.300,37.197 90.347,37.188 90.185 C 37.179 90.022,36.966 90.269,36.715 90.733 C 36.318 91.465,36.135 91.553,35.325 91.397 C 34.657 91.269,34.517 91.301,34.834 91.509 C 35.213 91.757,35.202 91.800,34.760 91.804 C 34.476 91.806,34.277 91.972,34.317 92.173 C 34.363 92.397,34.011 92.559,33.409 92.591 C 32.868 92.620,32.193 92.855,31.909 93.112 C 31.624 93.370,31.295 93.485,31.178 93.368 C 31.061 93.250,31.061 93.405,31.178 93.711 C 31.327 94.097,31.287 94.202,31.046 94.053 C 30.857 93.936,30.535 93.944,30.332 94.071 C 30.129 94.198,29.764 94.305,29.521 94.310 C 29.279 94.314,29.066 94.517,29.050 94.760 C 28.965 96.009,28.952 96.020,27.775 95.832 C 26.794 95.675,26.632 95.723,26.695 96.154 C 26.804 96.897,25.670 97.726,25.021 97.379 C 24.704 97.209,24.502 97.208,24.502 97.375 C 24.502 97.526,24.284 97.733,24.017 97.835 C 23.661 97.972,23.602 97.918,23.796 97.631 C 23.941 97.417,23.784 97.552,23.449 97.931 C 23.033 98.400,22.656 98.561,22.268 98.434 C 21.820 98.287,21.790 98.312,22.125 98.550 C 22.475 98.798,22.406 98.919,21.747 99.219 C 21.169 99.483,21.049 99.653,21.320 99.825 C 21.596 100.001,21.559 100.066,21.181 100.069 C 20.897 100.072,20.664 99.948,20.664 99.794 C 20.664 99.626,20.299 99.641,19.750 99.833 C 19.079 100.067,18.942 100.218,19.234 100.403 C 19.633 100.657,19.191 100.819,18.474 100.683 C 18.325 100.654,18.370 100.832,18.574 101.078 C 18.890 101.460,18.846 101.507,18.272 101.396 C 17.557 101.259,16.531 101.974,16.531 102.610 C 16.531 102.819,16.299 102.980,16.015 102.968 C 15.731 102.956,15.232 103.056,14.908 103.189 C 14.392 103.401,14.366 103.371,14.703 102.957 C 15.037 102.545,15.009 102.503,14.492 102.638 C 14.164 102.724,13.907 102.879,13.920 102.984 C 14.018 103.748,13.857 104.047,13.579 103.616 C 13.403 103.343,13.291 103.310,13.289 103.529 C 13.286 103.725,12.818 103.972,12.248 104.079 C 11.678 104.186,11.139 104.390,11.052 104.532 C 10.964 104.674,11.131 104.705,11.424 104.601 C 11.895 104.433,11.889 104.478,11.365 105.004 C 10.967 105.404,10.704 105.491,10.558 105.271 C 10.422 105.066,10.339 105.130,10.337 105.441 C 10.334 105.715,10.067 106.022,9.743 106.125 C 9.420 106.228,8.948 106.518,8.696 106.770 C 8.444 107.023,8.159 107.151,8.064 107.055 C 7.969 106.960,8.306 106.645,8.814 106.356 C 9.860 105.761,10.035 105.366,9.151 105.597 C 8.827 105.682,8.561 105.874,8.561 106.024 C 8.561 106.174,7.996 106.548,7.306 106.855 C 6.616 107.161,6.240 107.422,6.470 107.433 C 6.988 107.459,6.644 107.840,6.020 107.932 C 5.075 108.070,4.689 108.340,4.909 108.706 C 5.067 108.969,4.989 108.961,4.640 108.678 C 4.210 108.330,4.103 108.377,3.798 109.047 C 3.439 109.834,3.267 109.917,2.179 109.832 C 1.753 109.799,1.495 110.000,1.371 110.464 C 1.097 111.487,1.131 111.587,1.760 111.587 C 2.078 111.587,2.576 111.839,2.867 112.146 C 3.157 112.454,3.860 112.925,4.428 113.193 C 4.996 113.460,6.125 114.066,6.937 114.539 C 7.749 115.011,8.812 115.615,9.299 115.880 C 9.786 116.145,10.849 116.746,11.661 117.217 C 12.472 117.687,13.668 118.347,14.317 118.682 C 14.967 119.018,16.162 119.677,16.974 120.148 C 17.786 120.618,18.982 121.281,19.631 121.621 C 20.280 121.961,21.343 122.563,21.993 122.958 C 22.642 123.354,23.638 123.908,24.207 124.189 C 24.775 124.470,25.439 124.859,25.683 125.053 C 25.926 125.246,27.188 125.962,28.487 126.644 C 29.786 127.325,31.513 128.270,32.325 128.744 C 33.137 129.217,34.199 129.813,34.686 130.068 C 35.173 130.323,36.236 130.913,37.048 131.380 C 40.312 133.258,41.442 133.892,42.180 134.259 C 42.605 134.470,43.151 134.764,43.395 134.911 C 45.489 136.177,52.858 140.221,53.070 140.221 C 53.219 140.221,53.581 140.487,53.875 140.812 C 54.168 141.137,54.533 141.402,54.684 141.402 C 54.836 141.402,55.825 141.900,56.883 142.509 C 57.940 143.118,59.423 143.972,60.178 144.407 C 60.932 144.843,61.882 145.341,62.288 145.514 C 62.694 145.688,63.225 145.957,63.469 146.112 C 64.208 146.583,67.093 148.270,68.192 148.874 C 68.760 149.186,69.690 149.697,70.258 150.010 C 70.827 150.322,71.956 150.957,72.768 151.421 C 73.579 151.885,74.775 152.546,75.424 152.892 C 76.074 153.237,77.269 153.917,78.081 154.403 C 78.893 154.890,79.956 155.495,80.443 155.748 C 80.930 156.001,81.993 156.584,82.804 157.043 C 83.616 157.503,84.812 158.157,85.461 158.498 C 86.111 158.838,87.306 159.508,88.118 159.985 C 88.930 160.463,89.993 161.062,90.480 161.317 C 90.967 161.572,92.030 162.172,92.841 162.651 C 93.653 163.130,94.849 163.794,95.498 164.127 C 96.148 164.460,97.343 165.122,98.155 165.598 C 98.967 166.073,100.030 166.672,100.517 166.929 C 101.004 167.185,102.066 167.790,102.878 168.273 C 103.690 168.757,104.886 169.426,105.535 169.760 C 106.185 170.095,107.380 170.757,108.192 171.231 C 109.004 171.706,110.199 172.367,110.849 172.701 C 111.498 173.034,112.561 173.620,113.210 174.001 C 115.817 175.533,117.096 176.252,118.081 176.737 C 118.649 177.017,119.318 177.412,119.568 177.615 C 119.817 177.818,121.012 178.504,122.224 179.140 C 123.436 179.775,125.026 180.645,125.756 181.071 C 126.487 181.498,127.616 182.122,128.266 182.457 C 128.915 182.792,130.177 183.517,131.070 184.069 C 131.963 184.620,133.008 185.211,133.391 185.382 C 133.775 185.553,134.904 186.174,135.900 186.761 C 136.897 187.349,138.708 188.360,139.926 189.009 C 141.144 189.658,142.339 190.360,142.583 190.570 C 142.827 190.779,143.386 191.040,143.826 191.150 C 144.265 191.260,144.781 191.537,144.972 191.767 C 145.162 191.996,145.865 192.448,146.533 192.770 C 147.202 193.092,148.347 193.705,149.077 194.131 C 149.808 194.558,151.398 195.428,152.610 196.063 C 153.822 196.699,155.017 197.385,155.266 197.588 C 155.516 197.791,156.185 198.187,156.753 198.468 C 157.321 198.750,158.450 199.364,159.262 199.833 C 160.074 200.303,161.137 200.895,161.624 201.150 C 162.111 201.404,163.173 202.009,163.985 202.494 C 164.797 202.978,165.993 203.650,166.642 203.988 C 168.378 204.889,170.321 205.970,171.661 206.780 C 172.310 207.172,173.439 207.817,174.170 208.213 C 176.233 209.331,177.729 210.157,179.336 211.066 C 180.148 211.525,181.343 212.179,181.993 212.519 C 182.642 212.860,183.705 213.459,184.354 213.852 C 185.004 214.244,186.598 215.120,187.897 215.798 C 189.196 216.476,190.458 217.204,190.701 217.416 C 190.945 217.628,191.609 218.014,192.177 218.275 C 192.745 218.536,193.742 219.076,194.391 219.475 C 195.041 219.874,196.037 220.443,196.605 220.740 C 197.173 221.036,198.103 221.572,198.672 221.930 C 199.961 222.742,201.315 222.763,202.305 221.985 C 202.723 221.656,203.505 221.183,204.042 220.934 C 204.579 220.685,205.683 220.088,206.494 219.608 C 207.306 219.127,208.369 218.526,208.856 218.271 C 209.343 218.017,210.406 217.422,211.218 216.950 C 212.030 216.477,213.230 215.831,213.885 215.514 C 214.540 215.196,215.182 214.830,215.311 214.701 C 215.441 214.571,216.516 213.934,217.700 213.284 C 220.024 212.010,225.110 209.152,225.830 208.716 C 226.681 208.202,233.376 204.492,235.572 203.319 C 236.790 202.668,237.985 201.982,238.229 201.794 C 238.472 201.606,239.137 201.224,239.705 200.944 C 240.273 200.664,241.269 200.126,241.919 199.748 C 243.214 198.995,245.473 197.727,247.085 196.848 C 247.653 196.539,248.782 195.906,249.594 195.442 C 250.406 194.979,251.601 194.320,252.251 193.978 C 252.900 193.636,253.963 193.030,254.613 192.632 C 255.262 192.233,256.325 191.637,256.974 191.307 C 257.624 190.978,258.819 190.312,259.631 189.829 C 260.443 189.346,261.638 188.678,262.288 188.345 C 262.937 188.013,264.000 187.417,264.649 187.022 C 265.299 186.626,266.295 186.069,266.863 185.783 C 267.432 185.497,268.096 185.105,268.339 184.911 C 268.583 184.717,269.845 184.000,271.144 183.317 C 272.443 182.634,274.037 181.760,274.686 181.374 C 275.336 180.988,276.399 180.402,277.048 180.071 C 277.697 179.740,279.026 178.993,280.000 178.410 C 280.974 177.827,282.768 176.819,283.985 176.171 C 285.203 175.522,286.731 174.674,287.380 174.286 C 288.030 173.898,289.092 173.301,289.742 172.959 C 290.984 172.306,291.687 171.912,296.936 168.930 C 298.723 167.915,300.258 167.085,300.347 167.085 C 300.437 167.085,301.443 166.487,302.583 165.756 C 303.723 165.026,304.730 164.428,304.821 164.428 C 305.035 164.428,325.522 152.993,326.494 152.330 C 326.900 152.054,327.697 151.590,328.266 151.300 C 329.444 150.698,330.720 149.993,332.841 148.772 C 333.653 148.305,334.782 147.705,335.351 147.438 C 335.919 147.171,336.583 146.780,336.827 146.570 C 337.070 146.360,338.332 145.623,339.631 144.933 C 342.482 143.417,345.255 141.891,348.192 140.221 C 349.004 139.760,350.133 139.124,350.701 138.808 C 353.287 137.371,354.774 136.533,355.867 135.896 C 356.517 135.517,357.579 134.935,358.229 134.602 C 358.878 134.269,359.941 133.674,360.590 133.279 C 361.240 132.884,362.329 132.258,363.012 131.889 C 365.089 130.765,371.484 127.225,371.956 126.938 C 372.890 126.370,392.786 115.220,394.790 114.141 C 395.951 113.516,397.308 112.617,397.805 112.143 C 398.303 111.669,398.782 111.353,398.870 111.441 C 398.958 111.529,399.215 111.374,399.441 111.096 C 399.805 110.649,399.790 110.614,399.316 110.792 C 398.873 110.958,398.815 110.884,398.981 110.361 C 399.146 109.843,399.081 109.755,398.623 109.875 C 398.315 109.956,397.890 109.836,397.678 109.608 C 397.397 109.308,397.188 109.282,396.909 109.513 C 396.468 109.879,396.020 109.104,396.357 108.558 C 396.482 108.357,396.376 108.308,396.073 108.424 C 395.808 108.526,395.502 108.465,395.393 108.289 C 395.264 108.080,395.100 108.139,394.923 108.455 C 394.523 109.170,394.017 108.695,394.238 107.813 C 394.404 107.151,394.370 107.104,393.967 107.438 C 393.587 107.754,393.505 107.750,393.503 107.416 C 393.500 106.866,392.108 106.215,391.918 106.676 C 391.829 106.893,391.773 106.875,391.758 106.625 C 391.745 106.412,391.601 106.320,391.439 106.421 C 391.174 106.585,391.016 106.197,391.109 105.609 C 391.128 105.487,390.945 105.387,390.701 105.387 C 390.458 105.387,390.258 105.520,390.258 105.683 C 390.258 106.243,389.439 105.976,388.971 105.262 C 388.618 104.722,388.591 104.506,388.864 104.385 C 389.062 104.297,388.627 104.251,387.897 104.285 C 386.663 104.341,386.562 104.290,386.478 103.568 C 386.383 102.756,385.401 102.231,385.047 102.804 C 384.925 103.001,384.996 103.029,385.240 102.878 C 385.490 102.724,385.555 102.755,385.424 102.967 C 385.109 103.476,384.357 103.036,384.333 102.330 C 384.314 101.737,384.299 101.733,384.090 102.266 C 383.882 102.796,383.853 102.799,383.667 102.313 C 383.557 102.026,383.553 101.652,383.659 101.480 C 383.786 101.275,383.590 101.234,383.088 101.360 C 382.630 101.475,382.239 101.415,382.113 101.210 C 381.973 100.983,382.032 100.949,382.288 101.107 C 382.549 101.268,382.603 101.231,382.455 100.991 C 382.300 100.740,382.126 100.727,381.864 100.944 C 381.593 101.169,381.339 101.078,380.930 100.612 C 380.622 100.260,380.556 100.082,380.784 100.216 C 381.063 100.381,381.130 100.349,380.988 100.119 C 380.872 99.932,380.519 99.779,380.204 99.779 C 379.889 99.779,379.631 99.650,379.631 99.493 C 379.631 99.335,379.432 99.283,379.188 99.377 C 378.945 99.470,378.745 99.392,378.745 99.202 C 378.745 99.013,378.590 98.954,378.400 99.072 C 378.168 99.215,378.116 99.124,378.243 98.794 C 378.381 98.434,378.269 98.303,377.824 98.303 C 377.490 98.303,376.953 98.004,376.630 97.638 C 376.307 97.273,376.146 97.173,376.270 97.417 C 376.467 97.800,376.429 97.805,375.990 97.449 C 375.712 97.223,375.409 97.112,375.318 97.203 C 374.974 97.548,373.500 96.768,373.184 96.074 C 372.850 95.342,372.251 95.083,372.251 95.670 C 372.251 95.846,372.085 95.929,371.882 95.855 C 371.679 95.780,371.552 95.554,371.599 95.351 C 371.649 95.135,371.507 95.051,371.254 95.148 C 371.017 95.239,370.748 95.116,370.655 94.874 C 370.560 94.626,370.614 94.513,370.778 94.615 C 370.939 94.714,371.070 94.654,371.070 94.482 C 371.070 94.310,370.838 94.166,370.554 94.160 C 370.269 94.155,369.779 93.956,369.464 93.718 C 368.821 93.232,368.289 93.139,368.548 93.559 C 368.642 93.710,368.591 93.912,368.437 94.008 C 368.273 94.109,368.215 93.853,368.297 93.397 C 368.434 92.645,368.396 92.619,367.393 92.782 C 366.678 92.898,366.347 92.839,366.347 92.595 C 366.347 92.257,365.081 91.488,363.881 91.096 C 363.535 90.983,363.399 90.748,363.510 90.458 C 363.647 90.100,363.549 90.042,363.061 90.197 C 362.640 90.330,362.501 90.288,362.637 90.069 C 362.748 89.889,362.699 89.742,362.527 89.742 C 362.355 89.742,362.214 89.879,362.214 90.047 C 362.214 90.254,362.036 90.258,361.662 90.058 C 361.359 89.895,361.045 89.829,360.964 89.909 C 360.883 89.990,360.852 89.736,360.895 89.344 C 360.960 88.756,360.868 88.659,360.367 88.790 C 359.938 88.902,359.826 88.843,359.983 88.588 C 360.121 88.366,360.053 88.247,359.808 88.281 C 358.774 88.423,358.081 88.232,358.081 87.805 C 358.081 87.533,358.220 87.431,358.422 87.556 C 358.640 87.691,358.682 87.636,358.540 87.406 C 358.417 87.207,358.135 87.114,357.912 87.200 C 357.690 87.285,357.315 87.163,357.080 86.927 C 356.755 86.602,356.620 86.587,356.518 86.866 C 356.443 87.068,356.284 86.861,356.164 86.408 C 356.015 85.851,355.779 85.612,355.435 85.670 C 355.154 85.718,354.680 85.557,354.381 85.314 C 353.882 84.907,353.856 84.919,354.058 85.461 C 354.200 85.842,354.178 85.947,353.994 85.756 C 353.838 85.594,353.662 85.196,353.603 84.871 C 353.516 84.394,353.269 84.283,352.320 84.296 C 351.197 84.311,350.710 84.038,350.710 83.395 C 350.710 83.232,350.851 83.299,351.023 83.542 C 351.302 83.936,351.322 83.936,351.210 83.542 C 351.140 83.299,350.851 83.142,350.567 83.193 C 350.261 83.249,350.131 83.159,350.246 82.972 C 350.353 82.799,350.241 82.657,349.998 82.657 C 349.754 82.657,349.469 82.796,349.364 82.966 C 349.233 83.178,349.042 83.168,348.759 82.933 C 348.532 82.744,348.419 82.472,348.508 82.328 C 348.597 82.184,348.429 82.064,348.136 82.062 C 347.683 82.058,347.669 82.014,348.044 81.771 C 348.298 81.607,348.340 81.483,348.142 81.481 C 347.953 81.478,347.554 81.397,347.257 81.301 C 346.837 81.165,346.809 81.191,347.130 81.420 C 347.445 81.643,347.356 81.703,346.761 81.669 C 346.331 81.644,346.023 81.491,346.078 81.328 C 346.133 81.166,345.966 80.857,345.709 80.642 C 345.451 80.427,345.406 80.336,345.609 80.438 C 345.812 80.541,345.978 80.500,345.978 80.346 C 345.978 79.947,344.247 79.746,344.090 80.126 C 344.017 80.300,343.948 80.223,343.935 79.955 C 343.910 79.439,342.344 78.729,341.970 79.065 C 341.849 79.173,341.835 79.114,341.938 78.932 C 342.042 78.751,341.864 78.365,341.543 78.075 C 341.210 77.773,340.959 77.693,340.959 77.888 C 340.959 78.075,341.092 78.229,341.255 78.229 C 341.417 78.229,341.550 78.382,341.550 78.570 C 341.550 78.764,341.300 78.684,340.966 78.383 C 340.645 78.092,340.448 77.749,340.528 77.619 C 340.608 77.490,340.518 77.288,340.328 77.170 C 340.112 77.037,340.062 77.085,340.193 77.298 C 340.326 77.513,340.180 77.638,339.796 77.638 C 339.416 77.638,339.187 77.445,339.184 77.122 C 339.181 76.830,339.085 76.734,338.962 76.900 C 338.485 77.550,337.932 77.378,338.076 76.624 C 338.235 75.795,337.732 75.488,336.577 75.711 C 335.996 75.823,335.945 75.775,336.252 75.406 C 336.551 75.044,336.530 75.001,336.130 75.154 C 335.792 75.284,335.639 75.175,335.622 74.792 C 335.610 74.490,335.535 74.402,335.456 74.596 C 335.377 74.790,335.122 74.876,334.890 74.786 C 334.658 74.697,334.542 74.506,334.632 74.360 C 334.721 74.215,334.654 74.096,334.482 74.096 C 333.381 74.096,332.496 73.525,333.023 73.154 C 333.306 72.954,333.114 72.918,332.399 73.037 C 331.775 73.141,331.522 73.109,331.759 72.956 C 332.081 72.748,332.074 72.672,331.721 72.536 C 331.484 72.445,331.141 72.520,330.958 72.702 C 330.714 72.947,330.627 72.825,330.627 72.236 C 330.627 71.798,330.499 71.439,330.341 71.439 C 330.184 71.439,330.140 71.672,330.244 71.956 C 330.418 72.434,330.390 72.437,329.866 72.001 C 329.554 71.741,329.066 71.446,328.782 71.346 C 328.498 71.245,328.266 71.018,328.266 70.841 C 328.266 70.664,328.110 70.615,327.920 70.732 C 327.693 70.873,327.635 70.788,327.752 70.485 C 327.876 70.162,327.716 69.983,327.220 69.889 C 326.831 69.814,326.583 69.867,326.668 70.006 C 326.872 70.335,326.169 70.323,325.640 69.988 C 325.413 69.845,325.308 69.519,325.405 69.264 C 325.608 68.736,325.156 68.322,324.874 68.777 C 324.772 68.942,324.530 69.075,324.337 69.073 C 324.120 69.070,324.155 68.947,324.428 68.752 C 324.783 68.498,324.739 68.465,324.203 68.582 C 323.539 68.728,322.749 67.903,323.159 67.493 C 323.517 67.135,322.772 67.309,322.377 67.675 C 322.141 67.895,322.056 67.908,322.168 67.708 C 322.272 67.522,322.009 67.143,321.585 66.865 C 321.160 66.587,320.904 66.506,321.014 66.685 C 321.336 67.206,320.703 67.061,320.258 66.512 C 319.982 66.172,319.971 66.083,320.221 66.234 C 320.429 66.359,320.590 66.310,320.590 66.123 C 320.590 65.925,320.352 65.866,320.000 65.978 C 319.675 66.081,319.410 66.055,319.410 65.921 C 319.410 65.787,319.130 65.502,318.788 65.289 C 318.447 65.076,318.255 65.044,318.363 65.218 C 318.471 65.392,318.418 65.535,318.246 65.535 C 318.074 65.535,317.923 65.236,317.910 64.871 C 317.897 64.506,317.820 64.373,317.738 64.576 C 317.656 64.779,317.393 64.945,317.154 64.945 C 316.914 64.945,316.790 64.828,316.878 64.685 C 316.966 64.543,316.641 64.347,316.155 64.250 C 315.670 64.152,315.289 63.970,315.309 63.845 C 315.440 63.046,315.228 62.819,314.484 62.961 C 313.567 63.136,312.847 62.932,313.076 62.561 C 313.163 62.420,312.864 62.215,312.411 62.104 C 311.472 61.875,309.903 60.675,310.179 60.399 C 310.280 60.298,309.919 60.304,309.375 60.413 C 308.534 60.581,308.416 60.538,308.576 60.121 C 308.712 59.767,308.603 59.631,308.183 59.631 C 307.863 59.631,307.336 59.365,307.011 59.041 C 306.686 58.716,306.288 58.450,306.125 58.450 C 305.963 58.450,305.830 58.317,305.830 58.155 C 305.830 57.993,305.557 57.860,305.222 57.860 C 304.841 57.860,304.692 57.734,304.824 57.522 C 304.972 57.282,304.795 57.243,304.216 57.388 C 303.267 57.626,302.224 56.894,302.497 56.183 C 302.614 55.879,302.493 55.761,302.108 55.802 C 300.958 55.924,300.344 55.800,300.770 55.531 C 301.030 55.365,301.062 55.210,300.861 55.086 C 300.692 54.981,300.416 55.131,300.249 55.418 C 299.961 55.912,299.944 55.913,299.935 55.424 C 299.930 55.140,299.760 54.906,299.557 54.903 C 299.307 54.900,299.331 54.798,299.631 54.585 C 299.979 54.338,299.906 54.298,299.289 54.396 C 298.667 54.494,298.541 54.423,298.680 54.050 C 298.838 53.628,298.798 53.625,298.301 54.022 C 297.978 54.280,297.839 54.311,297.968 54.096 C 298.100 53.876,298.034 53.725,297.803 53.722 C 297.523 53.719,297.538 53.640,297.860 53.432 C 298.243 53.184,298.236 53.145,297.811 53.141 C 297.540 53.139,297.252 53.303,297.170 53.506 C 297.081 53.726,297.011 53.667,296.997 53.358 C 296.985 53.074,296.767 52.841,296.514 52.841 C 296.261 52.841,296.136 52.974,296.236 53.137 C 296.337 53.299,296.304 53.432,296.165 53.432 C 295.733 53.432,295.203 52.749,295.203 52.192 C 295.203 51.682,294.660 51.517,293.393 51.639 C 293.108 51.667,292.838 51.393,292.732 50.970 C 292.618 50.515,292.286 50.204,291.820 50.115 C 291.417 50.038,291.153 50.079,291.231 50.207 C 291.684 50.939,290.716 50.595,289.872 49.723 C 289.323 49.158,288.704 48.760,288.496 48.840 C 288.288 48.920,288.118 48.856,288.118 48.699 C 288.118 48.542,287.955 48.446,287.756 48.487 C 287.557 48.528,287.350 48.277,287.297 47.930 C 287.231 47.503,286.920 47.244,286.328 47.125 C 285.849 47.030,285.491 46.790,285.533 46.593 C 285.575 46.396,285.361 46.180,285.057 46.115 C 284.715 46.040,284.581 46.117,284.704 46.315 C 284.828 46.516,284.726 46.568,284.431 46.455 C 284.172 46.355,284.030 46.204,284.116 46.118 C 284.201 46.032,283.922 45.781,283.494 45.559 C 283.066 45.337,282.648 45.224,282.564 45.308 C 282.480 45.392,282.566 45.461,282.755 45.461 C 282.945 45.461,283.100 45.610,283.100 45.793 C 283.100 46.017,282.953 46.002,282.643 45.745 C 282.392 45.537,282.255 45.189,282.339 44.971 C 282.422 44.754,282.373 44.576,282.229 44.576 C 282.086 44.576,281.901 44.742,281.819 44.945 C 281.730 45.165,281.661 45.106,281.647 44.797 C 281.634 44.513,281.483 44.280,281.311 44.280 C 281.139 44.280,281.089 44.427,281.199 44.605 C 281.345 44.841,281.234 44.841,280.794 44.605 C 280.460 44.427,280.101 44.009,279.996 43.676 C 279.844 43.197,279.621 43.101,278.920 43.211 C 277.920 43.369,276.859 42.666,277.109 42.013 C 277.230 41.697,277.052 41.640,276.338 41.766 C 275.678 41.883,275.362 41.804,275.242 41.493 C 275.150 41.252,274.804 40.970,274.472 40.865 C 274.051 40.731,273.979 40.606,274.232 40.450 C 274.468 40.304,274.326 40.176,273.825 40.080 C 273.154 39.952,273.104 39.993,273.429 40.409 C 273.761 40.835,273.744 40.841,273.271 40.469 C 272.979 40.240,272.801 39.896,272.875 39.704 C 272.963 39.474,272.765 39.401,272.298 39.490 C 271.767 39.592,271.587 39.496,271.587 39.113 C 271.587 38.670,271.516 38.654,271.070 38.995 C 270.786 39.212,270.645 39.281,270.757 39.147 C 271.074 38.769,269.762 37.579,268.856 37.420 C 268.410 37.341,268.044 37.412,268.044 37.577 C 268.044 37.742,267.781 37.573,267.460 37.203 C 267.139 36.832,266.961 36.391,267.066 36.222 C 267.186 36.028,267.059 35.990,266.722 36.119 C 266.389 36.247,265.962 36.127,265.589 35.800 C 265.153 35.418,265.050 35.397,265.211 35.720 C 265.332 35.963,265.222 35.904,264.967 35.589 C 264.711 35.274,264.502 34.893,264.502 34.741 C 264.502 34.590,264.277 34.649,264.002 34.872 C 263.576 35.217,263.540 35.215,263.756 34.858 C 263.948 34.538,263.884 34.486,263.484 34.640 C 263.088 34.792,263.004 34.727,263.139 34.375 C 263.281 34.005,263.182 33.953,262.657 34.119 C 262.047 34.313,262.030 34.287,262.428 33.770 C 262.665 33.462,262.743 33.309,262.600 33.429 C 262.458 33.550,262.176 33.510,261.972 33.341 C 261.715 33.127,261.541 33.133,261.400 33.361 C 261.265 33.580,261.054 33.512,260.762 33.154 C 260.522 32.860,260.415 32.796,260.526 33.011 C 260.690 33.332,260.618 33.334,260.124 33.025 C 259.793 32.819,259.578 32.558,259.647 32.447 C 259.716 32.335,259.541 32.262,259.259 32.284 C 258.976 32.307,258.774 32.172,258.809 31.986 C 258.845 31.795,258.643 31.707,258.346 31.785 C 258.056 31.861,257.645 31.714,257.434 31.460 C 257.118 31.078,257.119 30.996,257.440 30.996 C 257.722 30.996,257.741 30.907,257.508 30.674 C 257.287 30.453,257.011 30.444,256.632 30.647 C 256.029 30.970,254.643 30.426,254.576 29.839 C 254.555 29.664,254.522 29.403,254.502 29.260 C 254.457 28.941,253.284 28.602,253.284 28.908 C 253.284 29.292,252.066 29.052,251.789 28.614 C 251.400 28.000,251.454 27.572,251.867 27.985 C 252.062 28.180,252.337 28.339,252.479 28.339 C 252.620 28.339,252.523 28.127,252.264 27.867 C 251.864 27.467,251.717 27.456,251.300 27.794 C 251.030 28.013,250.884 28.059,250.975 27.897 C 251.067 27.734,250.809 27.269,250.403 26.863 C 249.997 26.458,249.755 26.290,249.866 26.491 C 250.000 26.735,249.916 26.798,249.611 26.682 C 249.360 26.585,249.237 26.373,249.338 26.211 C 249.449 26.030,249.289 25.988,248.925 26.104 C 248.490 26.242,248.156 26.071,247.685 25.471 C 247.331 25.019,247.117 24.802,247.209 24.988 C 247.465 25.504,246.586 25.706,246.185 25.222 C 245.965 24.958,245.948 24.797,246.139 24.797 C 246.307 24.797,246.512 24.963,246.594 25.166 C 246.678 25.373,246.753 25.293,246.766 24.982 C 246.786 24.520,246.641 24.458,245.895 24.607 C 245.147 24.757,244.948 24.670,244.678 24.077 C 244.486 23.657,244.188 23.432,243.945 23.525 C 243.719 23.612,243.339 23.520,243.100 23.321 C 242.860 23.122,242.465 23.036,242.221 23.130 C 241.924 23.244,241.719 23.069,241.602 22.602 C 241.492 22.164,241.244 21.935,240.935 21.986 C 240.359 22.082,239.058 20.994,239.294 20.613 C 239.382 20.470,239.046 20.425,238.546 20.513 C 237.784 20.647,237.638 20.579,237.638 20.088 C 237.638 19.341,236.632 18.800,235.540 18.961 C 234.834 19.064,234.628 18.944,234.321 18.251 C 234.118 17.792,233.844 17.417,233.711 17.417 C 233.579 17.417,233.536 17.522,233.615 17.650 C 233.694 17.779,233.304 17.831,232.747 17.766 C 231.872 17.664,231.751 17.554,231.859 16.960 C 231.950 16.457,231.871 16.315,231.564 16.433 C 231.333 16.522,231.144 16.433,231.144 16.236 C 231.144 15.997,230.888 15.941,230.381 16.068 C 229.887 16.193,229.685 16.152,229.808 15.953 C 229.916 15.778,229.736 15.646,229.390 15.646 C 229.056 15.646,228.782 15.505,228.782 15.333 C 228.782 15.161,228.915 15.103,229.077 15.203 C 229.240 15.303,229.373 15.271,229.373 15.132 C 229.373 14.823,227.331 14.032,226.716 14.102 C 226.428 14.135,226.402 14.095,226.642 13.989 C 227.295 13.699,227.036 13.284,226.199 13.280 C 225.152 13.274,223.887 12.607,223.997 12.118 C 224.057 11.852,223.864 11.793,223.356 11.921 C 222.270 12.193,221.647 11.856,221.856 11.109 C 221.995 10.609,221.968 10.570,221.721 10.923 C 221.454 11.304,221.411 11.294,221.407 10.849 C 221.402 10.263,220.953 10.161,220.636 10.673 C 220.497 10.898,220.556 10.933,220.812 10.775 C 221.073 10.613,221.127 10.651,220.979 10.891 C 220.837 11.120,220.637 11.148,220.417 10.969 C 220.228 10.816,219.808 10.642,219.483 10.581 C 219.159 10.521,218.876 10.307,218.856 10.107 C 218.836 9.906,218.803 9.614,218.782 9.457 C 218.732 9.066,217.565 8.460,217.565 8.824 C 217.565 8.980,217.797 9.169,218.081 9.244 C 218.365 9.319,218.232 9.366,217.786 9.349 C 217.339 9.332,216.974 9.148,216.974 8.939 C 216.974 8.731,216.827 8.561,216.647 8.561 C 216.468 8.561,216.397 8.362,216.491 8.118 C 216.584 7.875,216.543 7.675,216.399 7.675 C 216.255 7.675,215.905 7.586,215.621 7.478 C 215.270 7.343,215.174 7.390,215.320 7.625 C 215.437 7.815,215.392 7.970,215.220 7.970 C 214.928 7.970,214.783 7.551,214.880 6.989 C 214.904 6.855,214.620 6.820,214.251 6.912 C 213.882 7.004,213.745 7.003,213.948 6.910 C 214.705 6.562,214.290 6.138,213.305 6.253 C 212.748 6.318,212.349 6.280,212.418 6.168 C 212.487 6.057,212.269 5.653,211.935 5.271 C 211.518 4.793,211.279 4.691,211.174 4.945 C 211.090 5.148,210.858 5.314,210.660 5.314 C 210.080 5.314,208.407 3.792,208.615 3.454 C 208.735 3.261,208.610 3.222,208.277 3.350 C 207.986 3.461,207.566 3.401,207.343 3.216 C 207.032 2.959,206.936 2.975,206.933 3.285 C 206.929 3.603,206.867 3.595,206.642 3.247 C 206.242 2.629,206.278 2.288,206.716 2.535 C 206.992 2.691,206.989 2.640,206.704 2.334 C 206.379 1.985,206.281 1.989,206.044 2.364 C 205.805 2.742,205.765 2.734,205.761 2.308 C 205.758 2.035,205.458 1.716,205.093 1.601 C 204.729 1.485,204.293 1.202,204.124 0.972 C 203.876 0.632,203.810 0.669,203.772 1.169 C 203.747 1.507,203.851 1.707,204.003 1.613 C 204.156 1.518,204.280 1.582,204.280 1.754 C 204.280 2.308,203.640 2.086,203.480 1.476 C 203.395 1.151,203.085 0.886,202.791 0.886 C 202.497 0.886,202.065 0.695,201.832 0.461 C 201.294 -0.077,199.814 -0.046,199.291 0.514 M160.980 21.443 C 160.687 21.889,160.419 22.070,160.352 21.867 C 160.287 21.672,160.480 21.326,160.781 21.098 C 161.541 20.522,161.561 20.556,160.980 21.443 M302.801 56.277 C 302.567 56.648,303.371 57.466,303.673 57.164 C 303.777 57.060,303.717 56.974,303.539 56.974 C 303.362 56.974,303.171 56.742,303.114 56.458 C 303.047 56.119,302.939 56.057,302.801 56.277 M64.876 75.277 C 64.522 75.844,64.059 76.072,64.059 75.678 C 64.059 75.515,64.954 74.722,65.169 74.696 C 65.211 74.691,65.079 74.952,64.876 75.277 M65.477 221.329 C 65.234 221.613,64.955 222.069,64.859 222.342 C 64.753 222.640,64.294 222.876,63.707 222.932 C 63.041 222.996,62.640 223.231,62.447 223.672 C 62.291 224.027,61.912 224.384,61.604 224.464 C 61.008 224.620,61.045 225.268,61.662 225.474 C 61.865 225.542,62.105 225.318,62.194 224.976 C 62.323 224.484,62.587 224.354,63.457 224.354 C 64.183 224.354,64.740 224.153,65.092 223.764 C 65.452 223.367,66.001 223.173,66.771 223.173 C 67.482 223.173,67.976 223.016,68.074 222.758 C 68.260 222.276,67.323 221.062,66.945 221.295 C 66.805 221.382,66.517 221.309,66.305 221.133 C 66.020 220.897,65.805 220.948,65.477 221.329 M332.066 222.140 C 332.046 222.221,332.007 222.454,331.979 222.657 C 331.952 222.860,331.759 222.989,331.551 222.945 C 331.344 222.900,331.259 223.002,331.364 223.171 C 331.468 223.340,331.677 223.402,331.829 223.308 C 331.980 223.215,332.103 223.279,332.103 223.451 C 332.103 223.623,332.365 223.764,332.684 223.764 C 333.080 223.764,333.211 223.622,333.096 223.321 C 333.002 223.077,333.051 222.878,333.203 222.878 C 333.356 222.878,333.481 222.679,333.481 222.435 C 333.481 222.035,332.162 221.760,332.066 222.140 M81.233 250.103 C 80.774 250.562,80.795 250.824,81.307 251.021 C 81.931 251.260,82.474 250.497,81.974 250.083 C 81.684 249.842,81.488 249.848,81.233 250.103 M85.125 252.472 C 84.579 253.242,84.824 254.322,85.527 254.248 C 85.930 254.206,86.305 254.406,86.497 254.765 C 86.843 255.411,87.525 255.537,87.848 255.015 C 87.964 254.827,87.746 254.445,87.353 254.149 C 86.967 253.858,86.737 253.533,86.843 253.427 C 87.057 253.213,86.053 252.103,85.645 252.103 C 85.503 252.103,85.268 252.269,85.125 252.472 M88.856 256.269 C 88.856 256.554,89.529 256.762,89.963 256.611 C 90.621 256.382,90.354 255.946,89.594 256.009 C 89.188 256.042,88.856 256.159,88.856 256.269 M90.955 257.230 C 90.610 257.646,90.767 257.872,91.808 258.461 C 92.178 258.670,92.190 258.635,91.877 258.249 C 91.671 257.995,91.586 257.571,91.687 257.307 C 91.911 256.723,91.419 256.672,90.955 257.230 M91.935 257.450 C 91.694 257.840,92.363 258.334,92.986 258.225 C 93.227 258.183,93.469 257.917,93.524 257.635 C 93.638 257.044,92.284 256.886,91.935 257.450 M315.124 270.120 C 315.009 270.305,315.049 270.591,315.212 270.755 C 315.631 271.174,316.605 270.927,316.605 270.402 C 316.605 269.871,315.417 269.645,315.124 270.120 M308.496 271.235 C 308.491 271.448,308.356 271.540,308.195 271.441 C 308.028 271.338,307.978 271.456,308.079 271.719 C 308.288 272.263,309.666 272.340,309.672 271.808 C 309.676 271.537,309.744 271.545,309.931 271.840 C 310.087 272.086,310.255 272.126,310.367 271.944 C 310.468 271.782,310.356 271.574,310.118 271.483 C 309.881 271.392,309.603 271.452,309.501 271.617 C 309.391 271.796,309.153 271.702,308.911 271.383 C 308.648 271.037,308.503 270.985,308.496 271.235 M113.520 274.566 C 113.764 275.038,114.144 275.424,114.364 275.424 C 114.585 275.424,114.838 275.702,114.926 276.040 C 115.031 276.440,115.276 276.620,115.625 276.553 C 116.379 276.408,116.297 275.591,115.516 275.480 C 115.122 275.424,114.834 275.144,114.778 274.762 C 114.721 274.369,114.387 274.056,113.881 273.922 L 113.076 273.708 113.520 274.566 M304.036 273.998 C 303.832 274.887,303.880 275.060,304.311 274.997 C 304.880 274.913,304.965 274.201,304.428 274.022 C 304.225 273.954,304.049 273.943,304.036 273.998 M293.875 278.672 C 293.627 279.071,293.961 279.557,294.482 279.557 C 294.716 279.557,294.908 279.292,294.908 278.967 C 294.908 278.356,294.196 278.152,293.875 278.672 M289.669 279.946 C 289.319 280.418,289.373 281.107,289.771 281.240 C 290.125 281.358,290.865 280.597,290.948 280.030 C 291.017 279.565,290.002 279.499,289.669 279.946 M286.269 281.654 C 286.529 282.646,287.195 282.960,287.706 282.332 C 287.957 282.023,288.079 281.936,287.977 282.137 C 287.855 282.378,287.949 282.442,288.250 282.327 C 288.714 282.149,288.895 281.359,288.487 281.292 C 286.875 281.025,286.136 281.146,286.269 281.654 M283.685 282.813 C 283.349 283.441,283.550 284.107,283.993 283.833 C 284.137 283.744,284.182 283.443,284.092 283.164 C 283.955 282.735,283.978 282.725,284.242 283.100 C 284.631 283.652,285.756 283.745,285.756 283.224 C 285.756 283.013,285.603 282.744,285.416 282.629 C 285.192 282.490,285.149 282.560,285.290 282.833 C 285.448 283.137,285.401 283.129,285.113 282.804 C 284.529 282.145,284.041 282.148,283.685 282.813 M281.476 283.966 C 281.133 284.063,280.877 284.396,280.866 284.761 C 280.849 285.307,280.952 285.359,281.656 285.157 C 282.101 285.029,282.541 285.001,282.635 285.095 C 282.728 285.188,282.804 284.969,282.804 284.607 C 282.804 284.246,282.683 284.025,282.534 284.117 C 282.386 284.209,282.220 284.175,282.165 284.042 C 282.111 283.909,281.801 283.874,281.476 283.966 M278.816 285.456 C 278.897 285.587,278.756 285.774,278.504 285.871 C 278.251 285.968,278.119 286.169,278.211 286.318 C 278.404 286.631,278.933 286.591,279.529 286.219 C 279.836 286.028,279.882 286.068,279.707 286.375 C 279.516 286.710,279.547 286.719,279.868 286.421 C 280.175 286.135,280.186 285.972,279.914 285.700 C 279.513 285.299,278.593 285.095,278.816 285.456 M276.015 286.596 C 276.015 286.784,275.849 286.904,275.646 286.863 C 275.443 286.823,275.310 286.956,275.351 287.159 C 275.391 287.362,275.280 287.528,275.105 287.528 C 274.306 287.528,275.128 288.247,275.949 288.266 C 276.458 288.279,276.815 288.229,276.742 288.157 C 276.670 288.084,276.742 287.867,276.902 287.673 C 277.104 287.430,277.012 287.158,276.604 286.789 C 276.270 286.486,276.015 286.403,276.015 286.596 M272.745 288.192 C 272.556 288.810,272.581 289.331,272.807 289.471 C 273.147 289.681,273.950 289.065,273.944 288.599 C 273.941 288.415,273.811 288.465,273.653 288.708 C 273.409 289.087,273.366 289.076,273.362 288.635 C 273.359 288.230,272.846 287.862,272.745 288.192 M271.172 289.845 C 270.753 290.521,271.827 291.033,272.316 290.390 C 272.402 290.277,272.386 290.249,272.280 290.328 C 272.174 290.406,271.929 290.253,271.735 289.988 C 271.486 289.647,271.320 289.605,271.172 289.845 M267.041 292.635 C 266.570 292.980,266.562 293.059,266.971 293.399 C 267.533 293.865,268.044 293.591,268.044 292.824 C 268.044 292.154,267.770 292.102,267.041 292.635 M154.560 293.948 C 154.259 294.232,154.106 294.299,154.219 294.096 C 154.333 293.893,154.307 293.727,154.161 293.727 C 154.015 293.727,153.744 294.059,153.559 294.465 L 153.223 295.203 154.840 295.203 C 155.730 295.203,156.458 295.070,156.458 294.908 C 156.458 294.745,156.303 294.613,156.113 294.613 C 155.924 294.613,155.856 294.525,155.963 294.418 C 156.640 293.742,155.267 293.282,154.560 293.948 " stroke="none" fill="#f45c24" fill-rule="evenodd"></path><path id="path2" d="M203.763 0.722 C 204.209 0.955,204.706 1.226,204.867 1.326 C 205.031 1.427,205.087 1.318,204.995 1.078 C 204.904 0.842,204.540 0.571,204.186 0.476 C 203.088 0.181,202.917 0.280,203.763 0.722 M195.298 1.054 C 195.043 1.309,194.834 1.560,194.834 1.612 C 194.834 1.835,195.887 1.596,196.084 1.328 C 196.664 0.539,196.033 0.319,195.298 1.054 M193.274 2.158 C 192.811 2.341,192.489 2.671,192.536 2.914 C 192.684 3.676,193.222 3.576,193.898 2.662 C 194.604 1.706,194.544 1.657,193.274 2.158 M205.756 2.057 C 205.756 2.214,205.961 2.265,206.211 2.169 C 206.495 2.060,206.634 2.140,206.580 2.382 C 206.533 2.595,206.760 2.826,207.085 2.895 C 207.410 2.964,207.773 3.171,207.892 3.355 C 208.011 3.539,208.109 3.557,208.109 3.395 C 208.109 2.930,207.730 2.479,207.030 2.111 C 206.243 1.696,205.756 1.676,205.756 2.057 M190.701 3.838 C 190.527 4.162,190.102 4.428,189.756 4.428 C 189.410 4.428,189.218 4.519,189.330 4.631 C 189.596 4.898,190.710 4.977,190.550 4.717 C 190.482 4.607,190.749 4.344,191.144 4.133 C 191.539 3.922,191.792 3.636,191.707 3.498 C 191.447 3.077,191.034 3.217,190.701 3.838 M208.708 3.497 C 208.708 3.973,209.747 4.599,210.627 4.654 C 211.114 4.684,211.314 4.626,211.070 4.526 C 210.827 4.426,210.275 4.097,209.844 3.796 C 208.981 3.192,208.708 3.120,208.708 3.497 M188.044 5.166 C 187.839 5.413,187.807 5.609,187.972 5.609 C 188.134 5.609,188.433 5.410,188.635 5.166 C 188.840 4.919,188.872 4.723,188.707 4.723 C 188.545 4.723,188.246 4.923,188.044 5.166 M185.171 6.790 C 184.893 7.114,184.503 7.380,184.304 7.380 C 184.105 7.380,183.584 7.712,183.146 8.118 C 182.657 8.571,182.509 8.856,182.764 8.856 C 182.992 8.856,183.334 8.609,183.523 8.306 C 183.897 7.706,185.092 7.260,185.092 7.720 C 185.092 7.877,185.234 7.918,185.408 7.810 C 185.581 7.703,185.654 7.436,185.570 7.218 C 185.479 6.979,185.569 6.878,185.796 6.965 C 186.004 7.045,186.175 6.905,186.175 6.655 C 186.175 6.030,185.776 6.084,185.171 6.790 M216.902 7.871 C 217.106 7.954,217.207 8.127,217.127 8.257 C 217.047 8.387,217.257 8.566,217.595 8.654 C 218.184 8.808,218.188 8.792,217.694 8.245 C 217.410 7.932,217.032 7.686,216.855 7.699 C 216.670 7.712,216.690 7.786,216.902 7.871 M180.968 9.140 C 180.729 9.291,180.606 9.487,180.694 9.575 C 180.783 9.663,181.111 9.542,181.424 9.305 C 182.046 8.834,181.668 8.697,180.968 9.140 M218.937 9.742 C 219.470 10.810,219.483 10.814,219.483 9.917 C 219.483 9.527,219.384 9.269,219.262 9.345 C 219.140 9.420,219.041 9.341,219.041 9.169 C 219.041 8.997,218.918 8.856,218.768 8.856 C 218.618 8.856,218.694 9.255,218.937 9.742 M219.779 9.742 C 219.678 9.904,219.660 10.037,219.737 10.037 C 219.815 10.037,220.090 10.118,220.348 10.217 C 220.692 10.349,220.770 10.270,220.636 9.922 C 220.429 9.384,220.049 9.304,219.779 9.742 M177.950 10.876 C 177.738 11.175,177.365 11.497,177.122 11.592 C 176.878 11.687,177.044 11.745,177.491 11.722 C 177.937 11.698,178.303 11.509,178.303 11.301 C 178.303 11.093,178.435 10.923,178.598 10.923 C 178.760 10.923,178.893 10.790,178.893 10.627 C 178.893 10.150,178.367 10.288,177.950 10.876 M221.402 10.645 C 221.402 10.817,221.521 10.884,221.666 10.794 C 221.811 10.705,222.027 10.996,222.145 11.441 C 222.264 11.887,222.417 12.099,222.486 11.913 C 222.556 11.723,222.896 11.650,223.261 11.745 C 223.838 11.896,223.860 11.867,223.457 11.492 C 222.461 10.566,221.402 10.129,221.402 10.645 M175.293 12.352 C 175.081 12.651,174.708 12.973,174.465 13.067 C 174.076 13.217,174.077 13.240,174.473 13.261 C 175.016 13.289,176.236 12.477,176.236 12.087 C 176.236 11.624,175.704 11.773,175.293 12.352 M224.794 12.571 C 225.223 13.033,225.711 13.279,226.035 13.196 C 226.503 13.074,226.496 13.053,225.975 13.023 C 225.649 13.004,225.216 12.723,225.013 12.399 C 224.810 12.074,224.519 11.808,224.366 11.808 C 224.213 11.808,224.405 12.151,224.794 12.571 M172.768 13.476 C 172.565 13.560,172.399 13.972,172.399 14.391 C 172.399 14.811,172.498 15.054,172.620 14.932 C 172.742 14.811,172.841 14.556,172.841 14.367 C 172.841 14.178,173.041 14.023,173.284 14.023 C 173.528 14.022,173.767 13.889,173.816 13.727 C 173.918 13.391,173.320 13.248,172.768 13.476 M227.079 13.635 C 227.143 13.827,227.353 14.038,227.546 14.102 C 227.762 14.174,227.828 14.039,227.718 13.752 C 227.512 13.215,226.902 13.103,227.079 13.635 M170.732 14.897 C 170.392 15.135,170.047 15.262,169.965 15.180 C 169.882 15.097,169.742 15.218,169.654 15.449 C 169.435 16.019,170.353 15.928,170.923 15.323 C 171.166 15.064,171.565 14.776,171.808 14.682 C 172.197 14.532,172.196 14.509,171.800 14.488 C 171.552 14.475,171.071 14.660,170.732 14.897 M229.373 14.996 C 229.373 15.381,230.048 15.941,230.511 15.941 C 230.852 15.941,230.830 15.819,230.406 15.351 C 229.857 14.744,229.373 14.578,229.373 14.996 M167.851 16.679 C 167.413 17.085,167.200 17.417,167.377 17.417 C 167.555 17.417,167.980 17.156,168.323 16.837 C 168.665 16.518,169.079 16.339,169.242 16.440 C 169.409 16.543,169.446 16.475,169.327 16.282 C 169.018 15.782,168.738 15.857,167.851 16.679 M232.139 16.473 C 231.928 16.609,232.006 16.872,232.368 17.247 C 232.774 17.669,232.916 17.707,232.920 17.395 C 232.923 17.046,232.973 17.049,233.210 17.417 C 233.368 17.661,233.496 17.727,233.496 17.565 C 233.496 17.170,232.927 16.302,232.915 16.679 C 232.910 16.841,232.805 16.815,232.681 16.621 C 232.558 16.426,232.314 16.360,232.139 16.473 M165.396 17.786 C 164.748 18.623,164.584 19.062,165.063 18.674 C 165.312 18.473,165.610 18.402,165.725 18.518 C 165.841 18.633,165.839 18.477,165.722 18.171 C 165.573 17.784,165.614 17.680,165.854 17.829 C 166.044 17.946,166.199 17.902,166.199 17.730 C 166.199 17.303,165.744 17.335,165.396 17.786 M234.096 17.730 C 234.096 17.902,234.219 17.966,234.370 17.873 C 234.521 17.780,234.729 17.971,234.833 18.298 C 234.936 18.625,235.205 18.893,235.430 18.893 C 235.705 18.893,235.615 18.651,235.155 18.155 C 234.420 17.362,234.096 17.232,234.096 17.730 M162.271 19.640 C 161.602 20.230,161.545 20.367,161.976 20.359 C 162.494 20.350,163.838 19.417,163.838 19.067 C 163.838 18.670,163.045 18.960,162.271 19.640 M237.645 19.785 C 238.189 20.316,238.701 20.588,238.910 20.457 C 239.147 20.308,239.070 20.197,238.675 20.119 C 238.352 20.055,237.912 19.753,237.699 19.448 C 237.485 19.143,237.180 18.893,237.021 18.893 C 236.862 18.893,237.143 19.295,237.645 19.785 M160.440 20.669 C 160.338 20.834,160.131 20.893,159.980 20.799 C 159.828 20.706,159.705 20.764,159.705 20.928 C 159.705 21.093,159.107 21.491,158.376 21.815 C 157.646 22.138,157.048 22.543,157.048 22.714 C 157.048 22.886,156.841 23.026,156.588 23.026 C 156.332 23.026,156.215 23.168,156.326 23.347 C 156.459 23.563,156.622 23.570,156.822 23.370 C 156.986 23.206,157.311 23.145,157.544 23.235 C 157.810 23.337,158.030 23.164,158.132 22.772 C 158.226 22.415,158.439 22.229,158.631 22.338 C 158.816 22.444,158.871 22.424,158.753 22.294 C 158.636 22.164,159.001 21.810,159.564 21.508 C 160.768 20.863,160.997 20.827,160.708 21.328 C 160.591 21.531,160.609 21.594,160.748 21.467 C 161.095 21.152,161.186 20.369,160.877 20.369 C 160.738 20.369,160.542 20.504,160.440 20.669 M239.257 20.672 C 239.155 20.838,239.240 20.938,239.448 20.893 C 239.656 20.848,239.832 20.967,239.839 21.156 C 239.846 21.346,239.973 21.611,240.121 21.747 C 240.277 21.890,240.301 21.838,240.178 21.624 C 240.061 21.421,240.115 21.255,240.299 21.255 C 240.499 21.255,240.455 21.077,240.190 20.812 C 239.667 20.289,239.509 20.265,239.257 20.672 M242.066 21.993 C 242.066 22.408,243.456 23.449,243.908 23.372 C 244.241 23.316,244.532 23.556,244.716 24.040 C 245.021 24.843,245.228 24.936,245.844 24.545 C 246.332 24.236,245.872 23.819,244.332 23.176 C 243.735 22.927,243.247 22.584,243.247 22.414 C 243.247 22.244,243.114 22.187,242.952 22.288 C 242.790 22.388,242.657 22.330,242.657 22.158 C 242.657 21.986,242.524 21.845,242.362 21.845 C 242.199 21.845,242.066 21.911,242.066 21.993 M154.891 23.953 C 154.377 24.515,154.377 24.532,154.891 24.445 C 155.426 24.354,155.854 23.956,155.863 23.542 C 155.870 23.166,155.449 23.344,154.891 23.953 M152.702 24.871 C 152.076 25.680,151.996 25.972,152.448 25.799 C 152.695 25.704,152.867 25.473,152.832 25.286 C 152.797 25.098,152.934 24.978,153.137 25.018 C 153.339 25.059,153.506 24.959,153.506 24.797 C 153.506 24.386,153.044 24.428,152.702 24.871 M150.000 26.531 C 149.696 26.836,149.264 27.157,149.041 27.246 C 148.817 27.335,149.000 27.418,149.446 27.431 C 149.933 27.445,150.229 27.311,150.185 27.099 C 150.144 26.903,150.310 26.724,150.554 26.701 C 151.935 26.568,151.912 26.579,151.439 26.273 C 150.815 25.870,150.628 25.904,150.000 26.531 M249.268 26.323 C 249.128 26.550,249.211 26.609,249.510 26.494 C 249.760 26.398,250.141 26.475,250.356 26.665 C 250.679 26.952,250.679 26.923,250.356 26.494 C 249.900 25.892,249.567 25.840,249.268 26.323 M252.103 27.749 C 252.103 27.911,252.236 28.044,252.399 28.044 C 252.561 28.044,252.694 28.227,252.694 28.450 C 252.694 28.695,253.012 28.856,253.493 28.856 C 253.933 28.856,254.336 28.987,254.389 29.146 C 254.681 30.020,255.224 30.450,255.224 29.807 C 255.224 29.344,254.876 29.005,253.959 28.574 C 253.263 28.247,252.694 27.861,252.694 27.717 C 252.694 27.572,252.561 27.454,252.399 27.454 C 252.236 27.454,252.103 27.587,252.103 27.749 M147.097 28.561 C 147.074 29.007,147.123 29.206,147.206 29.002 C 147.289 28.798,147.469 28.700,147.606 28.785 C 147.744 28.870,147.952 28.784,148.069 28.594 C 148.203 28.378,148.155 28.327,147.942 28.459 C 147.740 28.584,147.601 28.482,147.601 28.209 C 147.601 27.398,147.141 27.718,147.097 28.561 M145.240 29.015 C 144.834 29.203,144.396 29.526,144.266 29.733 C 144.136 29.941,143.844 30.111,143.617 30.111 C 143.390 30.111,142.846 30.443,142.408 30.849 C 141.970 31.255,141.768 31.587,141.959 31.587 C 142.150 31.587,142.387 31.376,142.486 31.119 C 142.630 30.743,142.714 30.728,142.915 31.045 C 143.112 31.356,143.165 31.340,143.169 30.972 C 143.173 30.531,143.480 30.416,144.737 30.385 C 145.029 30.377,145.413 30.053,145.590 29.664 C 145.768 29.275,146.126 28.900,146.388 28.830 C 146.764 28.730,146.771 28.700,146.421 28.689 C 146.177 28.681,145.646 28.828,145.240 29.015 M257.572 31.035 C 257.730 31.855,257.826 31.933,258.406 31.710 C 258.959 31.498,258.815 31.133,258.008 30.701 C 257.532 30.447,257.468 30.495,257.572 31.035 M139.926 32.030 C 139.672 32.335,139.661 32.472,139.890 32.472 C 140.072 32.472,140.221 32.332,140.221 32.160 C 140.221 31.988,140.354 31.929,140.517 32.030 C 140.679 32.130,140.812 32.071,140.812 31.899 C 140.812 31.448,140.353 31.515,139.926 32.030 M259.399 31.769 C 259.220 31.948,260.014 32.911,260.348 32.920 C 260.441 32.922,260.683 33.030,260.886 33.158 C 261.448 33.515,261.327 33.151,260.611 32.327 C 259.947 31.563,259.713 31.456,259.399 31.769 M137.024 33.764 C 136.154 34.406,136.124 34.479,136.671 34.622 C 137.063 34.725,137.269 34.635,137.269 34.364 C 137.269 34.135,137.476 33.948,137.730 33.948 C 138.006 33.948,138.104 33.810,137.976 33.603 C 137.832 33.369,137.926 33.320,138.269 33.452 C 138.570 33.567,138.703 33.528,138.596 33.355 C 138.329 32.923,138.074 32.989,137.024 33.764 M262.214 33.266 C 262.498 33.340,262.731 33.524,262.731 33.675 C 262.731 33.825,262.880 33.948,263.062 33.948 C 263.291 33.948,263.280 33.811,263.026 33.506 C 262.824 33.262,262.442 33.078,262.178 33.097 C 261.773 33.126,261.778 33.152,262.214 33.266 M264.725 34.735 C 264.929 34.817,265.030 34.992,264.949 35.123 C 264.867 35.254,265.138 35.446,265.549 35.549 C 265.961 35.652,266.225 35.853,266.137 35.996 C 266.049 36.138,266.243 36.185,266.568 36.100 C 266.898 36.014,267.159 36.091,267.159 36.276 C 267.159 36.457,267.258 36.589,267.380 36.570 C 268.163 36.447,268.482 36.618,268.044 36.927 C 267.684 37.182,267.681 37.219,268.026 37.126 C 268.874 36.896,268.624 36.401,267.466 36.019 C 266.815 35.804,266.060 35.383,265.789 35.083 C 265.518 34.784,265.084 34.549,264.825 34.562 C 264.517 34.577,264.483 34.637,264.725 34.735 M134.589 35.248 C 134.853 35.566,134.844 35.698,134.551 35.815 C 134.341 35.899,134.310 35.979,134.482 35.991 C 134.654 36.004,135.053 35.806,135.368 35.550 C 135.683 35.294,135.784 35.164,135.592 35.260 C 135.401 35.356,135.160 35.299,135.058 35.134 C 134.956 34.969,134.732 34.834,134.559 34.834 C 134.351 34.834,134.361 34.974,134.589 35.248 M132.715 36.183 C 132.177 36.721,132.127 37.084,132.553 37.348 C 132.720 37.451,132.837 37.425,132.814 37.291 C 132.700 36.634,132.900 36.267,133.506 36.024 C 133.981 35.833,134.029 35.752,133.674 35.738 C 133.402 35.728,132.970 35.928,132.715 36.183 M130.049 37.593 C 129.694 37.852,129.617 38.060,129.826 38.190 C 130.003 38.299,130.272 38.167,130.424 37.896 C 130.604 37.575,130.920 37.460,131.328 37.567 C 131.674 37.657,131.882 37.610,131.791 37.463 C 131.549 37.071,130.673 37.137,130.049 37.593 M271.587 39.016 C 271.587 39.205,271.671 39.276,271.774 39.173 C 271.877 39.070,272.293 39.247,272.699 39.567 C 273.764 40.404,274.180 40.282,273.238 39.410 C 272.398 38.631,271.587 38.438,271.587 39.016 M126.954 39.390 C 126.654 39.751,126.635 39.964,126.881 40.209 C 127.127 40.455,127.261 40.416,127.398 40.059 C 127.700 39.272,127.412 38.838,126.954 39.390 M124.280 40.886 C 123.432 41.511,123.374 41.624,123.896 41.624 C 124.235 41.624,124.589 41.423,124.683 41.178 C 124.777 40.933,125.008 40.767,125.195 40.809 C 125.382 40.851,125.596 40.720,125.670 40.517 C 125.880 39.944,125.375 40.078,124.280 40.886 M274.264 40.424 C 273.951 40.622,274.124 40.744,274.928 40.895 C 275.526 41.007,276.015 41.217,276.015 41.361 C 276.015 41.506,276.224 41.624,276.480 41.624 C 276.794 41.624,276.660 41.384,276.069 40.886 C 275.110 40.079,274.896 40.024,274.264 40.424 M121.673 42.325 C 120.779 42.985,120.760 43.036,121.349 43.191 C 122.084 43.383,122.867 43.144,122.650 42.794 C 122.567 42.660,122.635 42.467,122.800 42.365 C 123.157 42.144,123.200 41.624,122.862 41.624 C 122.731 41.624,122.196 41.939,121.673 42.325 M277.196 41.936 C 277.196 42.108,277.313 42.176,277.457 42.087 C 277.601 41.998,277.886 42.126,278.089 42.372 C 278.402 42.748,278.373 42.789,277.902 42.636 C 277.442 42.486,277.421 42.510,277.786 42.772 C 278.030 42.947,278.553 43.093,278.950 43.095 C 279.640 43.099,279.628 43.067,278.672 42.362 C 277.587 41.562,277.196 41.449,277.196 41.936 M279.852 43.338 C 279.852 44.029,280.705 44.716,281.087 44.334 C 281.409 44.013,281.377 43.872,280.903 43.523 C 280.263 43.050,279.852 42.978,279.852 43.338 M117.561 44.477 C 117.356 44.560,117.047 44.891,116.875 45.214 C 116.590 45.746,116.618 45.770,117.173 45.473 C 117.510 45.293,117.786 45.026,117.786 44.881 C 117.786 44.736,118.085 44.559,118.450 44.489 C 119.006 44.382,119.018 44.358,118.524 44.344 C 118.199 44.335,117.766 44.395,117.561 44.477 M281.919 44.490 C 282.162 44.579,282.594 44.855,282.878 45.103 C 283.188 45.373,283.395 45.421,283.395 45.222 C 283.395 44.843,282.440 44.269,281.864 44.304 C 281.596 44.320,281.613 44.378,281.919 44.490 M114.238 46.502 C 114.032 46.749,113.950 47.037,114.054 47.141 C 114.158 47.246,114.246 47.143,114.248 46.913 C 114.252 46.567,114.308 46.571,114.571 46.937 C 114.843 47.316,114.867 47.308,114.731 46.883 C 114.643 46.609,114.731 46.320,114.924 46.242 C 115.163 46.144,115.170 46.091,114.944 46.075 C 114.761 46.062,114.443 46.254,114.238 46.502 M112.251 47.553 C 111.886 47.691,111.587 47.941,111.587 48.109 C 111.587 48.276,111.354 48.422,111.070 48.432 C 110.674 48.446,110.709 48.513,111.218 48.718 C 112.061 49.057,112.693 48.817,112.931 48.069 C 113.168 47.321,113.066 47.244,112.251 47.553 M287.232 47.469 C 287.232 47.931,287.902 48.364,288.350 48.192 C 288.649 48.078,288.732 48.136,288.592 48.363 C 288.454 48.586,288.603 48.708,289.009 48.708 C 289.587 48.708,289.566 48.647,288.762 47.970 C 287.888 47.235,287.232 47.020,287.232 47.469 M108.979 49.410 L 108.027 50.112 108.772 50.255 C 109.529 50.399,109.873 50.152,110.203 49.225 C 110.453 48.524,110.110 48.576,108.979 49.410 M289.990 49.135 C 290.097 49.414,290.185 49.698,290.185 49.766 C 290.185 50.019,291.042 49.879,291.216 49.597 C 291.320 49.429,291.198 49.382,290.926 49.486 C 290.635 49.598,290.488 49.526,290.541 49.298 C 290.589 49.096,290.440 48.862,290.211 48.779 C 289.917 48.672,289.852 48.776,289.990 49.135 M292.662 50.651 C 292.761 50.908,292.841 51.227,292.841 51.360 C 292.841 51.493,293.335 51.601,293.938 51.601 C 294.542 51.601,295.084 51.748,295.144 51.926 C 295.203 52.105,295.474 52.247,295.744 52.242 C 296.362 52.230,295.336 51.365,294.704 51.365 C 294.491 51.365,294.052 51.100,293.727 50.775 C 293.021 50.069,292.412 49.998,292.662 50.651 M104.217 52.090 C 103.650 52.774,104.171 53.274,104.789 52.640 C 105.296 52.119,105.309 51.661,104.816 51.661 C 104.683 51.661,104.414 51.854,104.217 52.090 M101.624 53.578 C 101.147 54.120,101.157 54.317,101.663 54.317 C 101.888 54.317,102.141 54.052,102.226 53.727 C 102.405 53.042,102.151 52.979,101.624 53.578 M99.538 54.629 C 99.110 54.800,98.938 55.036,99.076 55.260 C 99.237 55.520,99.327 55.525,99.409 55.279 C 99.471 55.093,99.690 55.006,99.896 55.085 C 100.102 55.164,100.271 55.023,100.271 54.773 C 100.271 54.522,100.260 54.326,100.246 54.336 C 100.232 54.346,99.914 54.478,99.538 54.629 M300.120 54.773 C 300.216 55.023,300.367 55.156,300.455 55.067 C 300.544 54.979,300.860 55.127,301.157 55.396 C 301.454 55.665,301.697 55.752,301.697 55.590 C 301.697 55.203,300.712 54.317,300.281 54.317 C 300.096 54.317,300.023 54.522,300.120 54.773 M303.173 56.384 C 303.173 56.546,303.306 56.679,303.469 56.679 C 303.631 56.679,303.764 56.866,303.764 57.094 C 303.764 57.378,303.972 57.455,304.420 57.338 C 304.882 57.217,304.948 57.125,304.642 57.027 C 304.402 56.950,304.100 56.708,303.971 56.488 C 303.695 56.022,303.173 55.954,303.173 56.384 M307.237 58.659 C 307.646 58.738,307.828 58.922,307.706 59.135 C 307.597 59.327,307.616 59.385,307.748 59.265 C 307.881 59.144,308.168 59.194,308.386 59.375 C 308.667 59.607,308.782 59.610,308.782 59.382 C 308.782 58.966,307.791 58.439,307.104 58.490 C 306.721 58.519,306.759 58.567,307.237 58.659 M91.572 59.100 C 91.092 59.580,91.127 59.828,91.673 59.828 C 91.949 59.828,92.064 59.660,91.965 59.401 C 91.852 59.106,91.944 59.029,92.263 59.152 C 92.528 59.254,92.648 59.205,92.544 59.037 C 92.305 58.650,92.003 58.669,91.572 59.100 M88.915 60.576 C 88.484 61.007,88.456 61.402,88.856 61.402 C 89.018 61.402,89.118 61.242,89.077 61.047 C 89.037 60.851,89.159 60.685,89.348 60.678 C 89.865 60.657,90.203 60.221,89.702 60.221 C 89.464 60.221,89.110 60.381,88.915 60.576 M310.951 60.762 C 311.220 61.059,311.343 61.425,311.223 61.574 C 311.104 61.723,311.191 61.685,311.417 61.489 C 311.859 61.104,311.407 60.221,310.767 60.221 C 310.599 60.221,310.682 60.465,310.951 60.762 M86.716 61.892 C 85.818 62.366,85.605 63.178,86.421 63.022 C 86.705 62.968,87.033 62.913,87.149 62.901 C 87.266 62.888,87.277 62.657,87.173 62.387 C 87.061 62.094,87.104 61.970,87.281 62.079 C 87.444 62.179,87.577 62.068,87.577 61.832 C 87.577 61.596,87.566 61.416,87.552 61.434 C 87.539 61.451,87.162 61.657,86.716 61.892 M312.620 61.632 C 312.620 61.759,312.878 62.049,313.195 62.276 C 313.511 62.504,313.702 62.799,313.620 62.932 C 313.538 63.065,313.604 63.173,313.766 63.173 C 314.371 63.173,314.393 62.585,313.812 62.003 C 313.202 61.394,312.620 61.213,312.620 61.632 M315.277 63.134 C 315.277 63.410,316.015 64.043,316.925 64.547 C 317.418 64.821,317.540 64.806,317.540 64.474 C 317.540 64.246,317.363 64.059,317.146 64.059 C 316.930 64.059,316.753 63.948,316.753 63.811 C 316.753 63.675,316.421 63.412,316.015 63.227 C 315.609 63.042,315.277 63.000,315.277 63.134 M81.443 65.018 C 81.105 65.663,81.112 65.668,81.678 65.165 C 81.999 64.881,82.372 64.748,82.507 64.870 C 82.641 64.992,82.656 64.926,82.539 64.723 C 82.221 64.171,81.833 64.276,81.443 65.018 M79.764 65.889 C 79.569 66.084,79.410 66.134,79.410 66.001 C 79.410 65.867,79.210 65.923,78.967 66.125 C 78.723 66.328,78.524 66.598,78.524 66.726 C 78.524 67.111,79.383 66.863,79.779 66.364 C 79.982 66.108,80.347 65.827,80.590 65.740 C 80.974 65.603,80.972 65.579,80.576 65.558 C 80.324 65.546,79.959 65.694,79.764 65.889 M320.247 65.872 C 321.002 66.089,321.188 66.273,321.042 66.657 C 320.884 67.071,320.918 67.091,321.237 66.770 C 321.713 66.291,320.840 65.519,319.870 65.562 C 319.473 65.579,319.605 65.687,320.247 65.872 M76.293 67.729 C 75.880 68.034,75.809 68.243,76.039 68.477 C 76.489 68.934,77.343 68.534,77.343 67.865 C 77.343 67.197,77.063 67.161,76.293 67.729 M74.391 68.748 C 74.391 68.891,74.146 69.073,73.845 69.151 C 73.545 69.230,73.224 69.585,73.131 69.941 C 73.001 70.438,73.048 70.516,73.335 70.278 C 73.540 70.108,73.783 70.044,73.875 70.136 C 73.967 70.228,74.130 70.027,74.236 69.690 C 74.343 69.353,74.555 69.077,74.706 69.077 C 74.858 69.077,74.982 68.945,74.982 68.782 C 74.982 68.620,74.849 68.487,74.686 68.487 C 74.524 68.487,74.391 68.604,74.391 68.748 M325.432 68.941 C 325.518 69.524,325.903 69.854,325.909 69.348 C 325.912 69.001,325.956 68.998,326.167 69.330 C 326.313 69.562,326.495 69.611,326.596 69.447 C 326.692 69.291,326.456 69.020,326.071 68.845 C 325.512 68.590,325.384 68.609,325.432 68.941 M327.866 70.166 C 327.543 70.489,328.927 71.439,329.713 71.435 C 330.328 71.431,330.392 71.370,330.037 71.129 C 329.018 70.435,328.034 69.998,327.866 70.166 M68.793 71.869 C 68.416 72.323,68.605 72.915,69.126 72.915 C 69.297 72.915,69.359 72.716,69.266 72.472 C 69.172 72.229,69.225 72.030,69.382 72.030 C 69.539 72.030,69.668 71.897,69.668 71.734 C 69.668 71.303,69.204 71.374,68.793 71.869 M66.815 72.915 C 66.463 73.057,66.065 73.361,65.929 73.591 C 65.794 73.821,65.487 74.072,65.247 74.149 C 64.942 74.246,65.008 74.339,65.469 74.459 C 65.897 74.571,66.058 74.521,65.930 74.313 C 65.807 74.114,65.911 74.064,66.210 74.178 C 66.552 74.310,66.637 74.234,66.513 73.911 C 66.402 73.621,66.489 73.495,66.758 73.557 C 66.988 73.610,67.196 73.525,67.219 73.369 C 67.243 73.213,67.505 72.990,67.801 72.874 C 68.174 72.727,68.203 72.661,67.897 72.659 C 67.653 72.658,67.166 72.773,66.815 72.915 M333.108 73.256 C 332.974 73.474,333.028 73.516,333.258 73.374 C 333.469 73.243,333.790 73.377,334.032 73.697 C 334.260 73.998,334.450 74.104,334.456 73.934 C 334.478 73.180,333.469 72.672,333.108 73.256 M334.859 74.276 C 334.994 74.420,335.260 74.545,335.449 74.552 C 335.638 74.560,335.755 74.742,335.707 74.957 C 335.654 75.203,335.792 75.284,336.076 75.175 C 336.374 75.060,336.531 75.170,336.531 75.493 C 336.531 75.877,336.609 75.907,336.888 75.629 C 337.166 75.351,337.150 75.180,336.814 74.851 C 336.348 74.395,334.446 73.835,334.859 74.276 M63.284 75.119 C 62.973 75.930,63.342 76.233,63.695 75.458 C 63.915 74.974,63.935 74.686,63.748 74.686 C 63.584 74.686,63.375 74.881,63.284 75.119 M337.935 75.768 C 338.139 75.850,338.218 76.060,338.111 76.233 C 337.996 76.420,338.056 76.463,338.257 76.338 C 338.461 76.212,338.598 76.319,338.598 76.605 C 338.598 76.868,338.719 77.008,338.868 76.916 C 339.016 76.824,339.212 76.916,339.302 77.120 C 339.392 77.324,339.437 77.225,339.401 76.900 C 339.337 76.325,338.451 75.580,337.860 75.606 C 337.697 75.613,337.731 75.686,337.935 75.768 M59.013 77.524 C 58.796 77.786,58.348 78.109,58.018 78.243 C 57.541 78.436,57.520 78.490,57.916 78.505 C 58.191 78.516,58.506 78.377,58.617 78.197 C 58.762 77.963,58.881 77.971,59.038 78.224 C 59.177 78.449,59.310 78.300,59.403 77.813 C 59.574 76.917,59.539 76.890,59.013 77.524 M56.031 79.068 C 55.819 79.367,55.446 79.688,55.203 79.782 C 54.841 79.922,54.851 79.958,55.259 79.977 C 55.534 79.990,55.849 79.853,55.960 79.673 C 56.102 79.445,56.247 79.467,56.443 79.747 C 56.670 80.071,56.701 80.063,56.602 79.705 C 56.535 79.461,56.690 79.100,56.948 78.902 C 57.373 78.577,57.370 78.542,56.917 78.533 C 56.642 78.528,56.244 78.769,56.031 79.068 M53.562 80.423 C 53.095 80.768,53.059 80.917,53.368 81.230 C 53.677 81.544,53.777 81.497,53.913 80.975 C 54.026 80.545,54.232 80.394,54.542 80.513 C 54.847 80.630,54.932 80.573,54.791 80.345 C 54.512 79.894,54.257 79.910,53.562 80.423 M345.978 80.295 C 345.978 80.458,346.119 80.590,346.290 80.590 C 346.462 80.590,346.521 80.723,346.421 80.886 C 346.320 81.048,346.445 81.181,346.698 81.181 C 347.248 81.181,347.292 80.841,346.804 80.354 C 346.373 79.923,345.978 79.895,345.978 80.295 M51.119 81.807 C 50.316 82.109,50.423 82.853,51.248 82.703 C 51.963 82.572,52.029 82.500,51.908 81.978 C 51.833 81.658,51.633 81.614,51.119 81.807 M348.349 81.697 C 348.377 82.364,349.240 83.055,349.595 82.695 C 349.889 82.397,349.848 82.237,349.390 81.899 C 348.762 81.435,348.334 81.353,348.349 81.697 M49.004 83.100 C 48.750 83.406,48.739 83.542,48.968 83.542 C 49.150 83.542,49.299 83.395,49.299 83.216 C 49.299 83.036,49.505 82.968,49.757 83.065 C 50.020 83.165,50.138 83.116,50.035 82.949 C 49.779 82.535,49.430 82.586,49.004 83.100 M350.260 82.949 C 350.153 83.122,350.286 83.162,350.587 83.046 C 350.957 82.904,351.028 82.956,350.852 83.243 C 350.700 83.488,350.725 83.563,350.917 83.444 C 351.086 83.339,351.288 83.496,351.365 83.792 C 351.489 84.268,352.479 84.596,352.468 84.157 C 352.448 83.391,350.609 82.384,350.260 82.949 M46.319 84.609 C 46.102 84.870,45.654 85.194,45.324 85.328 C 44.876 85.510,44.845 85.576,45.204 85.590 C 45.468 85.600,45.850 85.410,46.052 85.166 C 46.254 84.923,46.602 84.723,46.826 84.723 C 47.049 84.723,47.232 84.590,47.232 84.428 C 47.232 83.981,46.763 84.074,46.319 84.609 M43.326 86.199 C 43.124 86.524,42.757 86.799,42.512 86.810 C 42.217 86.824,42.266 86.912,42.657 87.069 C 43.288 87.323,44.090 86.903,43.817 86.461 C 43.728 86.317,44.028 86.197,44.484 86.195 C 45.128 86.191,45.215 86.126,44.871 85.904 C 44.191 85.464,43.730 85.552,43.326 86.199 M356.015 85.838 C 356.015 86.242,357.184 87.086,357.716 87.066 C 358.127 87.051,358.105 86.998,357.606 86.796 C 357.263 86.657,356.902 86.333,356.803 86.076 C 356.621 85.601,356.015 85.419,356.015 85.838 M40.681 87.629 C 40.469 87.928,40.096 88.249,39.852 88.343 C 39.499 88.480,39.514 88.519,39.926 88.538 C 40.388 88.558,41.624 87.608,41.624 87.232 C 41.624 86.882,41.035 87.130,40.681 87.629 M358.906 87.548 C 359.270 87.803,359.479 88.167,359.371 88.360 C 359.228 88.615,359.278 88.613,359.560 88.352 C 360.031 87.916,359.478 87.085,358.717 87.085 C 358.365 87.085,358.412 87.202,358.906 87.548 M360.664 88.478 C 360.867 88.547,361.033 88.727,361.033 88.878 C 361.033 89.028,361.266 89.153,361.550 89.156 C 361.987 89.160,361.999 89.203,361.627 89.438 C 361.282 89.656,361.330 89.705,361.849 89.666 C 362.995 89.580,362.401 88.719,361.032 88.480 C 360.627 88.409,360.461 88.409,360.664 88.478 M38.425 88.874 C 37.643 89.188,37.708 89.889,38.519 89.889 C 38.849 89.889,39.095 89.633,39.157 89.225 C 39.213 88.860,39.226 88.569,39.186 88.580 C 39.147 88.590,38.804 88.723,38.425 88.874 M36.583 89.815 C 36.394 90.431,36.420 90.889,36.636 90.756 C 36.787 90.663,36.840 90.473,36.754 90.334 C 36.668 90.195,36.832 90.021,37.118 89.946 C 37.610 89.818,37.610 89.808,37.122 89.776 C 36.838 89.757,36.595 89.775,36.583 89.815 M362.804 90.028 C 362.804 90.185,363.025 90.229,363.296 90.125 C 363.626 89.998,363.717 90.050,363.573 90.282 C 363.456 90.472,363.509 90.627,363.690 90.627 C 363.872 90.627,363.938 90.760,363.838 90.923 C 363.737 91.085,363.902 91.218,364.204 91.218 C 364.506 91.218,364.905 91.370,365.090 91.555 C 365.344 91.809,365.387 91.737,365.264 91.265 C 365.039 90.405,362.804 89.280,362.804 90.028 M33.243 91.947 C 32.836 92.568,32.831 92.651,33.209 92.506 C 33.453 92.412,33.653 92.160,33.653 91.946 C 33.653 91.732,33.886 91.495,34.170 91.421 C 34.609 91.306,34.614 91.281,34.204 91.252 C 33.938 91.233,33.506 91.546,33.243 91.947 M30.701 93.284 C 30.376 93.609,29.970 93.875,29.798 93.875 C 29.626 93.875,29.572 94.014,29.677 94.184 C 29.808 94.397,29.994 94.389,30.272 94.159 C 30.494 93.974,30.781 93.888,30.910 93.966 C 31.038 94.045,31.383 93.790,31.674 93.401 C 32.365 92.479,31.598 92.387,30.701 93.284 M368.413 92.989 C 368.413 93.151,368.596 93.284,368.820 93.284 C 369.044 93.284,369.392 93.483,369.594 93.727 C 369.796 93.970,370.178 94.159,370.442 94.146 C 370.801 94.129,370.820 94.082,370.517 93.962 C 370.293 93.873,369.862 93.552,369.557 93.247 C 368.954 92.644,368.413 92.522,368.413 92.989 M28.413 94.490 C 28.048 94.628,27.749 94.869,27.749 95.024 C 27.749 95.180,27.583 95.364,27.380 95.434 C 27.177 95.504,27.237 95.528,27.514 95.487 C 27.790 95.446,28.067 95.499,28.129 95.603 C 28.192 95.708,28.202 95.627,28.153 95.424 C 28.103 95.221,28.191 95.039,28.349 95.018 C 28.506 94.998,28.768 94.965,28.930 94.945 C 29.216 94.909,29.376 94.507,29.176 94.327 C 29.122 94.278,28.779 94.352,28.413 94.490 M371.070 94.419 C 371.070 94.950,372.183 95.700,372.414 95.325 C 372.544 95.115,372.410 94.801,372.092 94.568 C 371.471 94.114,371.070 94.055,371.070 94.419 M373.727 95.941 C 373.405 96.149,373.390 96.228,373.671 96.232 C 373.883 96.234,373.981 96.360,373.887 96.511 C 373.794 96.662,373.824 96.852,373.955 96.932 C 374.085 97.013,374.219 96.757,374.251 96.362 C 374.319 95.549,374.325 95.554,373.727 95.941 M374.622 96.263 C 374.617 96.521,374.945 96.883,375.351 97.068 C 375.799 97.273,376.089 97.291,376.089 97.115 C 376.089 96.957,375.896 96.827,375.660 96.827 C 375.425 96.827,375.097 96.594,374.931 96.310 C 374.675 95.870,374.629 95.863,374.622 96.263 M24.207 97.139 C 24.207 97.311,24.092 97.381,23.951 97.294 C 23.633 97.097,22.565 98.235,22.824 98.494 C 22.927 98.598,23.095 98.465,23.197 98.199 C 23.299 97.933,23.487 97.780,23.614 97.858 C 23.741 97.937,24.002 97.811,24.195 97.579 C 24.387 97.347,24.756 97.238,25.015 97.337 C 25.326 97.457,25.412 97.401,25.271 97.172 C 25.005 96.741,24.207 96.717,24.207 97.139 M20.746 98.672 C 20.168 99.419,19.972 99.876,20.323 99.659 C 20.511 99.543,20.664 99.611,20.664 99.810 C 20.664 100.331,20.988 99.933,21.089 99.289 C 21.141 98.955,21.372 98.782,21.687 98.839 C 21.990 98.894,22.120 98.804,22.005 98.618 C 21.742 98.192,21.096 98.220,20.746 98.672 M378.844 98.745 C 378.844 98.989,379.017 99.188,379.228 99.188 C 379.448 99.188,379.540 98.999,379.443 98.745 C 379.349 98.502,379.176 98.303,379.058 98.303 C 378.940 98.303,378.844 98.502,378.844 98.745 M18.376 100.083 C 18.011 100.230,17.712 100.487,17.712 100.655 C 17.712 100.822,17.505 100.959,17.252 100.959 C 16.999 100.959,16.873 101.091,16.972 101.251 C 17.082 101.429,17.460 101.342,17.936 101.030 C 18.367 100.748,18.758 100.550,18.806 100.590 C 18.854 100.631,18.882 100.579,18.868 100.476 C 18.854 100.372,19.020 100.175,19.237 100.038 C 19.748 99.713,19.228 99.741,18.376 100.083 M380.993 100.203 C 381.083 100.436,381.323 100.563,381.527 100.485 C 381.731 100.406,382.068 100.547,382.277 100.798 C 382.485 101.049,382.872 101.244,383.136 101.231 C 383.495 101.214,383.513 101.167,383.210 101.047 C 382.987 100.958,382.555 100.637,382.251 100.332 C 381.593 99.674,380.757 99.588,380.993 100.203 M15.572 101.573 C 15.288 101.739,15.055 102.004,15.055 102.162 C 15.055 102.320,15.365 102.246,15.743 101.998 C 16.121 101.751,16.541 101.648,16.676 101.770 C 16.811 101.893,16.826 101.827,16.709 101.624 C 16.455 101.183,16.257 101.175,15.572 101.573 M386.467 103.340 C 386.530 103.789,386.762 104.059,387.085 104.059 C 387.854 104.059,387.841 103.601,387.057 103.081 C 386.391 102.639,386.369 102.649,386.467 103.340 M10.525 104.746 C 10.257 105.043,10.037 105.396,10.037 105.530 C 10.037 105.663,10.283 105.489,10.583 105.143 C 10.884 104.796,11.237 104.610,11.369 104.729 C 11.500 104.847,11.512 104.779,11.395 104.576 C 11.123 104.102,11.106 104.105,10.525 104.746 M391.144 105.732 C 391.144 105.921,391.234 105.986,391.343 105.877 C 391.453 105.767,391.885 105.977,392.303 106.344 L 393.063 107.011 392.347 106.199 C 391.588 105.338,391.144 105.165,391.144 105.732 M5.385 107.380 C 5.100 107.664,4.303 108.149,3.614 108.458 C 2.925 108.767,2.362 109.122,2.362 109.248 C 2.362 109.374,2.196 109.534,1.993 109.604 C 1.790 109.674,1.856 109.696,2.140 109.653 C 2.424 109.610,2.657 109.692,2.657 109.834 C 2.657 110.301,3.516 109.774,3.700 109.194 C 3.799 108.881,3.988 108.693,4.121 108.775 C 4.253 108.857,4.514 108.739,4.702 108.513 C 4.889 108.287,5.375 108.019,5.781 107.917 C 6.187 107.815,6.446 107.614,6.357 107.470 C 6.268 107.327,6.362 107.142,6.566 107.060 C 6.790 106.969,6.732 106.901,6.421 106.887 C 6.137 106.874,5.670 107.096,5.385 107.380 M394.550 107.435 C 394.426 107.636,394.472 107.948,394.653 108.129 C 394.834 108.310,394.982 108.348,394.982 108.215 C 394.982 108.081,395.169 108.128,395.398 108.318 C 395.683 108.554,395.875 108.565,396.006 108.354 C 396.111 108.184,396.038 108.044,395.843 108.044 C 395.649 108.044,395.329 107.825,395.133 107.557 C 394.863 107.188,394.722 107.158,394.550 107.435 M396.335 108.593 C 396.144 108.904,398.452 109.986,398.724 109.714 C 398.830 109.608,398.763 109.520,398.573 109.520 C 398.384 109.520,397.963 109.255,397.638 108.930 C 397.004 108.296,396.586 108.188,396.335 108.593 M399.114 110.209 C 399.114 110.453,399.269 110.704,399.459 110.767 C 399.679 110.840,399.590 111.088,399.211 111.456 C 398.885 111.771,398.539 112.252,398.441 112.525 C 398.344 112.797,397.691 113.298,396.992 113.638 C 396.292 113.979,395.055 114.651,394.244 115.132 C 393.432 115.612,392.369 116.213,391.882 116.466 C 391.395 116.719,390.332 117.312,389.520 117.784 C 388.708 118.255,387.513 118.920,386.863 119.262 C 386.214 119.604,385.018 120.269,384.207 120.740 C 383.395 121.212,382.332 121.805,381.845 122.058 C 381.358 122.311,380.295 122.910,379.483 123.389 C 378.672 123.868,377.476 124.537,376.827 124.876 C 376.177 125.215,374.982 125.873,374.170 126.339 C 373.358 126.805,372.229 127.443,371.661 127.758 C 371.092 128.072,369.310 129.085,367.700 130.008 C 366.090 130.932,363.832 132.199,362.682 132.824 C 361.532 133.449,358.199 135.320,355.277 136.981 C 352.354 138.643,349.565 140.208,349.077 140.460 C 348.590 140.711,345.734 142.303,342.731 143.997 C 336.300 147.623,335.563 148.033,332.841 149.508 C 331.705 150.124,330.642 150.731,330.480 150.858 C 330.208 151.069,328.808 151.853,326.199 153.254 C 325.631 153.560,324.502 154.202,323.690 154.683 C 322.878 155.163,321.815 155.762,321.328 156.014 C 320.841 156.266,319.779 156.866,318.967 157.346 C 318.155 157.827,316.893 158.539,316.162 158.927 C 312.939 160.641,312.391 160.942,310.996 161.757 C 310.185 162.232,309.055 162.877,308.487 163.189 C 307.919 163.502,306.790 164.129,305.978 164.583 C 305.166 165.037,304.037 165.664,303.469 165.977 C 302.900 166.290,301.817 166.900,301.062 167.332 C 297.205 169.539,295.475 170.512,293.727 171.459 C 292.672 172.031,291.319 172.775,290.722 173.113 C 286.647 175.417,280.517 178.838,280.148 179.015 C 279.904 179.132,279.083 179.584,278.322 180.019 C 275.364 181.715,267.874 185.898,267.454 186.090 C 267.210 186.201,266.280 186.743,265.387 187.295 C 264.494 187.847,263.232 188.573,262.583 188.908 C 261.934 189.243,260.871 189.829,260.221 190.209 C 259.572 190.589,257.978 191.470,256.679 192.168 C 255.380 192.866,254.118 193.590,253.875 193.778 C 253.631 193.966,252.967 194.347,252.399 194.626 C 251.830 194.904,250.701 195.527,249.889 196.009 C 249.077 196.491,248.015 197.094,247.528 197.349 C 247.041 197.604,245.978 198.198,245.166 198.669 C 244.354 199.141,243.159 199.804,242.509 200.143 C 241.860 200.481,240.664 201.150,239.852 201.629 C 239.041 202.108,237.978 202.709,237.491 202.963 C 237.004 203.218,235.941 203.816,235.129 204.292 C 234.317 204.768,233.122 205.433,232.472 205.770 C 231.823 206.107,230.627 206.772,229.815 207.248 C 229.004 207.724,227.916 208.312,227.399 208.555 C 226.882 208.797,225.971 209.327,225.375 209.731 C 224.779 210.136,223.608 210.814,222.773 211.238 C 221.938 211.663,220.632 212.363,219.872 212.795 C 219.111 213.226,216.388 214.749,213.820 216.178 C 211.252 217.607,208.952 218.895,208.708 219.040 C 203.591 222.082,201.212 223.232,200.332 223.089 L 199.382 222.935 200.353 223.995 L 201.323 225.055 201.409 258.431 C 201.456 276.789,201.561 292.007,201.641 292.251 C 201.722 292.494,201.892 292.860,202.018 293.063 C 202.145 293.266,202.183 293.538,202.103 293.667 C 201.881 294.026,202.289 294.510,203.001 294.732 C 203.800 294.981,204.070 294.580,203.709 293.680 C 203.447 293.027,203.371 293.035,203.284 293.727 C 203.219 294.246,202.669 294.189,202.565 293.653 C 202.511 293.369,202.642 293.132,202.857 293.127 C 203.102 293.121,203.035 292.957,202.674 292.684 C 202.359 292.446,202.240 292.251,202.410 292.251 C 202.579 292.251,203.050 292.558,203.455 292.934 L 204.192 293.617 204.570 292.713 C 204.778 292.215,204.931 291.708,204.909 291.587 C 204.848 291.233,205.172 291.329,205.651 291.808 C 206.598 292.755,208.638 291.947,208.265 290.772 C 208.114 290.298,208.215 290.268,209.204 290.492 C 210.319 290.743,211.238 290.399,210.902 289.856 C 210.813 289.712,210.889 289.594,211.070 289.594 C 211.252 289.594,211.318 289.461,211.218 289.299 C 211.117 289.137,211.184 289.004,211.365 289.004 C 211.547 289.004,211.612 288.869,211.510 288.704 C 211.408 288.539,211.180 288.493,211.004 288.602 C 210.813 288.720,210.769 288.662,210.894 288.459 C 211.010 288.271,211.330 288.116,211.604 288.114 C 211.979 288.110,212.008 288.049,211.720 287.866 C 211.407 287.667,211.407 287.569,211.720 287.320 C 212.348 286.824,213.167 286.971,213.073 287.563 C 212.994 288.057,213.110 288.162,213.653 288.088 C 213.775 288.072,214.339 288.060,214.908 288.062 C 215.603 288.065,215.718 288.019,215.260 287.922 C 214.674 287.798,214.632 287.710,214.964 287.301 C 215.208 287.000,215.222 286.901,215.002 287.033 C 214.810 287.148,214.577 287.119,214.484 286.968 C 214.206 286.518,215.131 286.781,215.729 287.322 C 216.264 287.806,216.679 287.731,216.679 287.152 C 216.679 286.999,216.461 286.958,216.194 287.060 C 215.827 287.201,215.785 287.155,216.022 286.870 C 216.193 286.664,216.358 286.362,216.388 286.199 C 216.418 286.037,216.562 285.937,216.708 285.978 C 216.855 286.018,216.974 285.911,216.974 285.739 C 216.974 285.567,217.107 285.509,217.269 285.609 C 217.437 285.712,217.565 285.464,217.565 285.036 C 217.565 284.620,217.679 284.280,217.819 284.280 C 218.212 284.280,217.952 285.811,217.512 286.090 C 217.208 286.283,217.205 286.339,217.497 286.342 C 217.704 286.345,218.013 286.039,218.184 285.663 C 218.431 285.122,218.675 285.006,219.358 285.106 C 220.022 285.204,220.221 285.118,220.221 284.733 C 220.221 284.332,220.048 284.272,219.336 284.428 C 218.756 284.555,218.450 284.506,218.450 284.286 C 218.450 284.102,218.583 284.032,218.745 284.133 C 218.908 284.233,219.041 284.094,219.041 283.823 C 219.041 283.523,219.201 283.393,219.455 283.491 C 219.682 283.578,219.952 283.566,220.053 283.464 C 220.384 283.134,222.113 283.127,222.508 283.455 C 223.047 283.902,223.155 283.669,222.810 282.804 C 222.638 282.373,222.458 282.220,222.377 282.435 C 222.176 282.971,221.893 282.890,221.444 282.171 C 221.098 281.617,221.107 281.561,221.521 281.719 C 221.780 281.819,221.993 281.772,221.993 281.614 C 221.993 281.149,222.882 281.289,223.072 281.785 C 223.217 282.163,223.324 282.131,223.700 281.594 C 224.130 280.980,224.172 280.974,224.540 281.479 C 224.847 281.898,224.956 281.923,225.059 281.595 C 225.262 280.954,225.168 280.157,224.908 280.318 C 224.780 280.397,224.761 280.690,224.865 280.969 C 225.030 281.409,224.990 281.423,224.565 281.078 C 224.145 280.736,224.134 280.620,224.489 280.266 C 225.208 279.547,225.529 279.796,225.414 280.984 C 225.339 281.769,225.422 282.116,225.687 282.116 C 225.906 282.116,225.996 281.926,225.898 281.671 C 225.776 281.352,225.863 281.278,226.207 281.410 C 226.519 281.530,226.636 281.465,226.544 281.224 C 226.442 280.958,226.695 280.889,227.445 280.976 C 228.112 281.054,228.487 280.974,228.487 280.753 C 228.487 280.563,228.614 280.486,228.769 280.582 C 228.925 280.678,229.272 280.420,229.541 280.009 C 229.811 279.598,230.212 279.262,230.434 279.262 C 230.656 279.262,230.922 278.926,231.025 278.515 C 231.167 277.950,231.348 277.811,231.769 277.944 C 232.469 278.167,232.499 277.620,231.808 277.226 C 231.326 276.951,231.334 276.889,231.923 276.293 C 232.428 275.782,232.665 275.718,233.104 275.973 C 233.422 276.158,233.491 276.296,233.267 276.301 C 233.054 276.306,232.973 276.461,233.087 276.645 C 233.327 277.033,234.069 275.863,234.085 275.070 C 234.102 274.271,235.034 273.905,235.646 274.458 C 235.930 274.715,236.162 274.794,236.162 274.634 C 236.162 274.473,236.356 274.342,236.592 274.342 C 236.829 274.342,236.963 274.438,236.890 274.555 C 236.609 275.010,238.672 275.068,239.114 274.617 C 239.509 274.215,239.490 274.182,238.939 274.313 C 238.533 274.409,238.197 274.260,237.958 273.878 C 237.690 273.449,237.687 273.353,237.945 273.512 C 238.137 273.631,238.411 273.546,238.552 273.322 C 238.756 273.000,238.811 273.023,238.815 273.432 C 238.817 273.716,238.989 273.948,239.196 273.948 C 239.808 273.948,240.937 273.031,240.791 272.652 C 240.700 272.415,241.000 272.331,241.731 272.389 C 242.504 272.450,242.646 272.405,242.237 272.230 C 241.678 271.990,241.678 271.981,242.237 271.565 C 242.549 271.333,242.847 270.945,242.900 270.701 C 242.961 270.420,242.766 270.503,242.366 270.929 C 242.019 271.298,241.594 271.512,241.421 271.405 C 241.217 271.279,241.272 271.116,241.573 270.948 C 241.855 270.790,241.967 270.491,241.855 270.199 C 241.712 269.827,241.790 269.759,242.187 269.912 C 242.472 270.021,242.877 270.111,243.087 270.111 C 243.297 270.111,243.469 270.442,243.469 270.849 C 243.469 271.293,243.300 271.587,243.045 271.587 C 242.812 271.587,242.708 271.726,242.813 271.896 C 243.052 272.283,243.838 271.693,243.838 271.126 C 243.838 270.852,244.123 270.785,244.811 270.896 C 245.491 271.007,245.902 270.912,246.175 270.582 C 246.435 270.269,246.455 270.111,246.235 270.111 C 246.053 270.111,245.904 270.244,245.904 270.406 C 245.904 270.568,245.763 270.701,245.591 270.701 C 245.419 270.701,245.361 270.568,245.461 270.406 C 245.562 270.244,245.495 270.111,245.314 270.111 C 245.132 270.111,245.067 269.976,245.169 269.811 C 245.271 269.646,245.469 269.581,245.609 269.668 C 245.749 269.754,245.939 269.702,246.033 269.551 C 246.337 269.058,245.242 269.406,244.865 269.921 C 244.533 270.375,244.481 270.378,244.316 269.950 C 244.136 269.480,244.805 268.520,245.104 268.818 C 245.189 268.904,245.482 269.007,245.753 269.047 C 246.024 269.086,246.381 269.309,246.546 269.541 C 246.786 269.880,246.813 269.861,246.679 269.446 C 246.588 269.162,246.642 268.930,246.799 268.930 C 246.956 268.930,247.085 269.063,247.085 269.225 C 247.085 269.387,247.433 269.520,247.859 269.520 C 248.519 269.520,248.578 269.454,248.260 269.070 C 248.054 268.823,247.819 268.688,247.736 268.771 C 247.654 268.853,247.397 268.690,247.166 268.409 C 246.935 268.127,246.830 268.063,246.933 268.266 C 247.043 268.483,246.931 268.635,246.659 268.635 C 246.040 268.635,246.074 268.505,246.937 267.574 C 247.343 267.136,247.677 266.896,247.680 267.042 C 247.682 267.187,247.813 267.107,247.970 266.863 C 248.215 266.485,248.257 266.496,248.261 266.937 C 248.266 267.444,248.720 267.574,250.258 267.510 C 250.624 267.494,250.923 267.608,250.923 267.763 C 250.923 267.918,251.117 268.044,251.355 268.044 C 251.970 268.044,252.409 267.105,252.075 266.507 C 251.727 265.885,252.310 265.464,252.793 265.988 C 253.056 266.273,253.050 266.311,252.768 266.151 C 252.565 266.037,252.399 266.084,252.399 266.256 C 252.399 266.659,253.191 266.662,253.440 266.260 C 253.544 266.091,253.479 265.770,253.295 265.548 C 253.018 265.214,253.167 265.172,254.155 265.305 C 254.813 265.393,255.350 265.348,255.350 265.205 C 255.350 265.062,255.010 264.925,254.593 264.901 C 253.080 264.813,253.477 263.949,255.055 263.895 C 255.731 263.872,255.744 263.849,255.203 263.620 C 254.680 263.400,254.722 263.347,255.567 263.163 C 256.162 263.032,256.447 262.829,256.322 262.621 C 256.190 262.400,256.270 262.407,256.558 262.640 C 256.865 262.888,257.122 262.901,257.427 262.686 C 257.773 262.441,257.748 262.416,257.301 262.562 C 256.825 262.717,256.799 262.677,257.122 262.287 C 257.331 262.036,257.570 261.899,257.653 261.983 C 257.737 262.067,258.009 261.970,258.258 261.769 C 258.624 261.473,258.666 261.477,258.478 261.790 C 258.294 262.096,258.478 262.134,259.349 261.971 C 260.110 261.828,260.393 261.863,260.258 262.081 C 260.019 262.468,261.240 262.453,261.758 262.063 C 262.029 261.858,262.033 261.665,261.773 261.249 C 261.433 260.704,260.959 260.728,260.959 261.289 C 260.959 261.452,261.092 261.503,261.255 261.402 C 261.417 261.302,261.550 261.427,261.550 261.680 C 261.550 262.265,261.076 262.280,260.855 261.702 C 260.755 261.443,260.471 261.330,260.159 261.426 C 259.868 261.515,260.030 261.352,260.517 261.064 C 261.004 260.776,261.502 260.568,261.624 260.602 C 261.745 260.636,261.845 260.531,261.845 260.369 C 261.845 260.207,262.077 260.076,262.362 260.078 C 262.755 260.082,262.785 260.142,262.486 260.331 C 262.220 260.500,262.449 260.637,263.206 260.760 C 264.484 260.967,265.206 260.539,264.987 259.702 C 264.878 259.287,264.959 259.187,265.299 259.318 C 265.769 259.498,266.568 259.023,266.568 258.563 C 266.568 258.422,266.269 258.355,265.904 258.415 C 265.539 258.475,265.041 258.374,264.797 258.192 C 264.412 257.903,264.407 257.927,264.759 258.376 C 265.107 258.819,265.101 258.893,264.717 258.893 C 264.015 258.893,263.909 258.151,264.554 257.748 C 265.022 257.456,265.233 257.460,265.613 257.769 C 266.019 258.098,266.061 258.083,265.904 257.661 C 265.757 257.271,265.862 257.193,266.406 257.292 C 266.997 257.399,267.125 257.262,267.322 256.310 C 267.449 255.697,267.603 255.423,267.667 255.697 C 267.748 256.041,268.002 256.151,268.504 256.060 C 269.010 255.968,269.225 256.063,269.225 256.378 C 269.225 256.692,269.514 256.820,270.185 256.806 C 270.889 256.791,271.001 256.729,270.605 256.573 C 270.309 256.456,270.080 256.241,270.097 256.096 C 270.113 255.950,269.912 255.799,269.649 255.760 C 268.861 255.645,268.765 255.338,269.459 255.157 C 269.818 255.063,270.111 254.825,270.111 254.628 C 270.111 254.405,270.549 254.274,271.268 254.282 C 272.540 254.297,272.545 255.100,271.276 255.503 C 270.632 255.708,270.987 256.558,271.697 256.508 C 271.906 256.493,271.892 256.429,271.661 256.336 C 271.458 256.254,271.292 256.051,271.292 255.885 C 271.292 255.719,271.491 255.659,271.734 255.753 C 271.994 255.852,272.177 255.756,272.177 255.520 C 272.177 255.299,272.383 255.039,272.635 254.943 C 272.898 254.842,273.016 254.891,272.913 255.059 C 272.813 255.221,273.060 255.351,273.471 255.351 C 273.877 255.351,274.290 255.219,274.389 255.059 C 274.497 254.883,274.357 254.847,274.037 254.966 C 273.572 255.141,273.555 255.105,273.908 254.672 C 274.129 254.400,274.221 253.947,274.113 253.666 C 274.005 253.385,274.012 253.249,274.127 253.364 C 274.242 253.480,274.548 253.409,274.807 253.208 C 275.217 252.888,275.228 252.904,274.893 253.332 C 274.365 254.008,274.891 254.245,275.686 253.688 C 276.208 253.322,276.268 253.147,275.987 252.808 C 275.699 252.461,275.732 252.422,276.169 252.590 C 276.536 252.730,276.635 252.686,276.489 252.449 C 276.306 252.153,276.593 251.992,277.208 252.048 C 277.296 252.056,277.312 251.586,277.244 251.004 C 277.138 250.101,277.195 249.973,277.625 250.138 C 277.902 250.245,278.285 250.334,278.474 250.337 C 278.672 250.339,278.630 250.463,278.376 250.627 C 278.133 250.785,278.000 250.922,278.081 250.933 C 280.187 251.212,280.787 251.212,281.302 250.937 C 281.641 250.755,281.919 250.458,281.919 250.276 C 281.919 250.090,281.683 250.159,281.379 250.434 C 280.564 251.171,279.737 251.099,280.216 250.332 C 280.419 250.007,280.694 249.742,280.826 249.742 C 280.959 249.742,280.973 249.895,280.857 250.083 C 280.727 250.294,280.776 250.343,280.988 250.213 C 281.175 250.097,281.328 249.784,281.328 249.518 C 281.328 249.141,281.407 249.112,281.683 249.387 C 282.282 249.987,283.563 249.812,283.949 249.077 C 284.141 248.712,284.232 248.646,284.151 248.930 C 284.070 249.214,284.130 249.446,284.284 249.446 C 284.438 249.446,284.647 249.115,284.749 248.711 C 284.898 248.117,285.066 248.008,285.619 248.147 C 286.331 248.326,287.689 248.034,287.416 247.761 C 287.217 247.562,287.979 246.790,288.375 246.790 C 288.539 246.790,288.770 246.634,288.887 246.444 C 289.031 246.212,288.940 246.161,288.609 246.287 C 288.339 246.391,288.118 246.347,288.118 246.190 C 288.118 246.033,287.977 245.904,287.805 245.904 C 287.634 245.904,287.568 246.026,287.661 246.175 C 287.828 246.447,287.074 247.384,286.695 247.376 C 286.267 247.366,285.637 246.811,285.832 246.616 C 285.945 246.503,286.207 246.549,286.414 246.718 C 286.747 246.991,287.873 246.281,287.591 245.975 C 287.483 245.857,288.340 244.994,288.550 245.008 C 289.280 245.057,289.965 244.943,289.668 244.823 C 289.465 244.741,289.299 244.544,289.299 244.386 C 289.299 244.228,289.432 244.180,289.594 244.280 C 289.756 244.381,289.889 244.333,289.889 244.175 C 289.889 244.016,289.723 243.827,289.520 243.753 C 289.317 243.680,289.669 243.616,290.302 243.611 C 290.964 243.605,291.295 243.699,291.082 243.830 C 290.820 243.992,290.807 244.118,291.039 244.261 C 291.218 244.372,291.363 244.621,291.361 244.814 C 291.358 245.036,291.276 245.056,291.139 244.871 C 290.800 244.409,290.188 244.388,290.363 244.845 C 290.450 245.071,290.677 245.232,290.869 245.202 C 291.509 245.105,291.998 244.668,291.862 244.314 C 291.770 244.075,292.068 243.992,292.801 244.051 C 293.720 244.126,293.779 244.097,293.210 243.850 C 292.845 243.691,292.546 243.410,292.546 243.225 C 292.546 243.033,292.324 242.966,292.030 243.069 C 291.599 243.219,291.608 243.175,292.086 242.805 C 292.401 242.561,292.534 242.357,292.381 242.352 C 292.228 242.346,292.426 242.073,292.820 241.745 C 293.816 240.916,294.322 241.702,293.560 242.894 C 293.281 243.332,293.158 243.592,293.288 243.471 C 293.419 243.351,293.696 243.394,293.905 243.567 C 294.187 243.801,294.383 243.725,294.667 243.270 C 294.880 242.929,295.379 242.646,295.791 242.634 C 296.198 242.621,296.364 242.543,296.161 242.461 C 295.631 242.247,296.013 241.771,296.714 241.771 C 297.085 241.771,297.226 241.898,297.094 242.112 C 296.966 242.318,297.012 242.373,297.211 242.250 C 297.646 241.981,297.322 241.181,296.778 241.181 C 296.506 241.181,296.435 241.045,296.583 240.812 C 296.712 240.609,296.820 240.343,296.822 240.221 C 296.833 239.661,297.374 239.928,297.417 240.516 C 297.465 241.171,297.860 241.852,297.860 241.281 C 297.860 241.120,298.237 241.043,298.698 241.111 C 299.213 241.187,299.696 241.057,299.952 240.775 C 300.920 239.709,301.249 239.270,301.156 239.171 C 301.102 239.113,301.135 238.988,301.230 238.893 C 301.325 238.798,301.406 238.909,301.411 239.139 C 301.417 239.429,301.516 239.392,301.733 239.019 C 301.978 238.598,301.928 238.391,301.503 238.069 C 301.204 237.842,301.026 237.643,301.107 237.625 C 302.007 237.430,302.268 237.432,302.145 237.631 C 301.923 237.990,303.858 238.202,304.277 237.866 C 304.478 237.704,304.582 237.473,304.508 237.353 C 304.434 237.233,304.701 236.985,305.102 236.802 C 305.502 236.620,305.820 236.301,305.807 236.095 C 305.789 235.799,305.752 235.798,305.635 236.089 C 305.415 236.633,304.649 236.537,304.649 235.966 C 304.649 235.695,304.741 235.565,304.853 235.677 C 304.965 235.789,305.220 235.513,305.420 235.062 C 305.716 234.394,305.787 234.352,305.807 234.834 C 305.828 235.347,306.064 235.435,307.594 235.502 C 309.066 235.567,309.329 235.506,309.186 235.133 C 309.075 234.844,309.188 234.686,309.506 234.686 C 309.818 234.686,309.919 234.821,309.782 235.055 C 309.663 235.258,310.040 234.969,310.619 234.412 C 311.624 233.446,311.699 231.990,310.716 232.535 C 310.545 232.629,310.581 232.521,310.795 232.294 C 311.126 231.943,311.252 231.970,311.646 232.472 C 312.019 232.948,312.074 232.963,311.931 232.546 C 311.833 232.262,311.882 232.030,312.039 232.030 C 312.196 232.030,312.325 232.162,312.325 232.325 C 312.325 232.791,313.710 232.668,314.222 232.156 C 314.758 231.621,314.811 231.256,314.391 230.996 C 314.229 230.896,314.096 230.962,314.096 231.144 C 314.096 231.325,313.963 231.392,313.801 231.292 C 313.638 231.191,313.506 231.250,313.506 231.422 C 313.506 231.853,312.697 231.817,312.551 231.380 C 312.370 230.837,313.277 229.888,313.551 230.332 C 313.672 230.528,314.210 230.706,314.745 230.729 C 315.281 230.751,315.971 230.875,316.279 231.005 C 316.677 231.172,316.957 231.078,317.253 230.675 C 317.614 230.185,317.608 230.098,317.210 230.015 C 316.959 229.963,316.753 229.797,316.753 229.646 C 316.753 229.496,316.615 229.373,316.447 229.373 C 316.239 229.373,316.241 229.558,316.454 229.956 C 316.709 230.432,316.684 230.508,316.318 230.368 C 316.072 230.274,315.944 230.078,316.034 229.932 C 316.124 229.787,316.066 229.668,315.906 229.668 C 315.746 229.668,315.572 229.888,315.520 230.157 C 315.432 230.606,315.391 230.605,315.005 230.140 C 314.671 229.736,314.666 229.653,314.981 229.725 C 315.198 229.775,315.538 229.505,315.736 229.125 C 315.951 228.711,316.174 228.562,316.291 228.752 C 316.563 229.192,317.886 229.038,318.075 228.544 C 318.161 228.321,318.162 228.027,318.077 227.890 C 317.993 227.754,318.079 227.546,318.270 227.429 C 318.499 227.287,318.543 227.355,318.400 227.630 C 318.282 227.858,318.378 227.808,318.615 227.519 C 318.998 227.050,319.064 227.044,319.225 227.464 C 319.324 227.723,319.538 227.852,319.699 227.752 C 319.861 227.653,319.924 227.751,319.840 227.971 C 319.729 228.259,320.009 228.390,320.841 228.439 C 321.951 228.504,322.939 227.646,322.081 227.360 C 321.909 227.303,321.844 227.132,321.937 226.981 C 322.207 226.545,322.656 226.984,322.666 227.693 C 322.674 228.276,322.705 228.288,322.977 227.821 C 323.143 227.535,323.199 227.171,323.100 227.012 C 323.002 226.853,323.110 226.795,323.341 226.884 C 323.572 226.972,323.978 226.829,324.242 226.564 C 324.765 226.042,324.912 225.089,324.423 225.390 C 324.258 225.492,324.190 225.684,324.272 225.817 C 324.354 225.950,324.191 226.240,323.908 226.461 C 323.455 226.817,323.438 226.809,323.761 226.394 C 323.963 226.135,324.033 225.829,323.917 225.713 C 323.802 225.598,323.903 225.379,324.141 225.228 C 324.693 224.879,325.696 224.861,325.484 225.203 C 325.396 225.345,325.652 225.461,326.052 225.461 C 326.883 225.461,327.594 224.817,327.099 224.511 C 326.929 224.405,326.790 224.527,326.790 224.780 C 326.790 225.033,326.659 225.240,326.499 225.240 C 326.340 225.240,326.431 224.775,326.702 224.207 C 326.973 223.638,327.360 223.173,327.562 223.173 C 327.764 223.173,327.972 222.875,328.024 222.509 C 328.155 221.584,329.296 221.455,329.756 222.315 C 330.052 222.868,330.036 222.941,329.650 222.793 C 329.040 222.559,328.515 223.214,328.865 223.774 C 329.314 224.495,330.190 223.715,330.158 222.620 C 330.143 222.113,330.234 221.697,330.359 221.697 C 330.485 221.697,330.630 221.332,330.681 220.886 C 330.737 220.402,330.933 220.106,331.165 220.155 C 331.379 220.199,332.150 219.834,332.877 219.343 C 333.604 218.852,334.384 218.450,334.611 218.450 C 334.837 218.450,335.195 218.216,335.408 217.929 C 335.831 217.357,337.404 216.568,337.644 216.807 C 337.726 216.890,338.184 216.629,338.661 216.228 C 339.138 215.827,339.709 215.498,339.929 215.498 C 340.149 215.498,340.414 215.232,340.517 214.908 C 340.649 214.490,340.963 214.317,341.589 214.317 C 342.693 214.317,343.616 213.842,343.616 213.274 C 343.616 213.036,343.875 212.841,344.192 212.841 C 344.508 212.841,345.358 212.443,346.080 211.956 C 346.801 211.469,347.518 211.070,347.672 211.070 C 347.827 211.070,348.179 210.820,348.456 210.514 C 348.733 210.207,349.352 209.879,349.831 209.783 C 350.338 209.682,350.701 209.421,350.701 209.159 C 350.701 208.752,351.381 208.558,352.376 208.681 C 352.567 208.705,352.808 208.455,352.912 208.127 C 353.089 207.569,353.517 207.371,354.982 207.167 C 355.306 207.122,355.804 206.753,356.087 206.347 C 356.370 205.941,356.602 205.725,356.603 205.866 C 356.604 206.008,356.804 205.959,357.048 205.756 C 357.292 205.554,357.491 205.488,357.491 205.609 C 357.491 205.730,357.669 205.681,357.887 205.500 C 358.105 205.319,358.371 205.259,358.477 205.365 C 358.584 205.472,358.672 205.335,358.672 205.060 C 358.672 204.502,359.914 203.914,360.565 204.164 C 360.968 204.319,361.758 203.333,361.466 203.040 C 361.390 202.965,361.494 202.888,361.697 202.871 C 362.738 202.781,363.222 202.558,363.385 202.093 C 363.484 201.811,363.693 201.584,363.849 201.589 C 364.960 201.624,366.461 200.867,366.181 200.413 C 366.093 200.271,366.214 200.228,366.449 200.319 C 366.685 200.409,366.965 200.341,367.072 200.168 C 367.347 199.723,367.900 199.773,367.663 200.221 C 367.555 200.424,367.823 200.159,368.257 199.631 C 368.691 199.103,369.218 198.672,369.428 198.672 C 369.638 198.672,370.145 198.408,370.555 198.085 C 370.966 197.762,371.976 197.353,372.802 197.176 C 373.628 196.999,374.272 196.703,374.236 196.518 C 374.200 196.333,374.598 195.964,375.121 195.697 C 375.644 195.430,375.988 195.127,375.884 195.023 C 375.710 194.849,376.227 194.716,376.753 194.799 C 376.875 194.818,376.974 194.687,376.974 194.507 C 376.974 194.314,377.249 194.249,377.644 194.348 C 378.153 194.475,378.446 194.318,378.868 193.691 C 379.173 193.237,379.602 192.844,379.822 192.817 C 380.042 192.790,380.419 192.745,380.660 192.718 C 380.901 192.691,381.176 192.426,381.270 192.128 C 381.365 191.830,381.680 191.587,381.972 191.587 C 382.263 191.587,382.992 191.197,383.591 190.721 C 384.190 190.245,384.933 189.904,385.242 189.963 C 385.598 190.032,385.869 189.864,385.984 189.501 C 386.084 189.187,386.422 188.910,386.736 188.886 C 387.050 188.861,387.472 188.828,387.675 188.812 C 387.878 188.796,388.290 188.417,388.590 187.970 C 389.000 187.361,389.377 187.159,390.104 187.159 C 390.747 187.159,391.208 186.958,391.477 186.559 C 391.700 186.229,392.280 185.893,392.768 185.812 C 393.255 185.731,393.939 185.318,394.288 184.894 C 394.729 184.359,395.110 184.171,395.533 184.282 C 395.888 184.375,396.116 184.307,396.078 184.120 C 396.043 183.943,396.513 183.525,397.121 183.191 L 398.227 182.583 398.228 148.479 C 398.229 119.643,398.293 114.283,398.644 113.782 C 398.873 113.456,399.105 112.928,399.161 112.609 C 399.216 112.290,399.441 111.889,399.659 111.718 C 400.132 111.347,400.008 110.061,399.483 109.888 C 399.280 109.821,399.114 109.966,399.114 110.209 M1.771 112.472 C 3.127 113.613,3.563 113.613,2.314 112.472 C 1.781 111.985,1.208 111.590,1.041 111.595 C 0.874 111.599,1.203 111.994,1.771 112.472 M3.567 113.447 C 3.635 113.496,4.089 113.770,4.576 114.055 L 5.461 114.574 4.764 113.966 C 4.381 113.632,3.927 113.358,3.756 113.358 C 3.584 113.358,3.499 113.398,3.567 113.447 M7.380 115.693 C 7.786 116.025,8.251 116.298,8.413 116.299 C 8.729 116.301,8.195 115.892,7.232 115.395 C 6.840 115.192,6.890 115.292,7.380 115.693 M12.184 118.376 C 12.597 118.701,13.031 118.967,13.149 118.967 C 13.267 118.967,13.026 118.701,12.613 118.376 C 12.200 118.052,11.766 117.786,11.648 117.786 C 11.530 117.786,11.771 118.052,12.184 118.376 M25.346 125.739 C 25.730 126.073,26.184 126.347,26.355 126.347 C 26.718 126.347,26.701 126.332,25.535 125.650 L 24.649 125.131 25.346 125.739 M32.340 129.619 C 32.542 129.946,34.255 130.862,34.398 130.719 C 34.453 130.664,33.974 130.332,33.334 129.982 C 32.694 129.631,32.247 129.468,32.340 129.619 M38.040 132.824 C 38.423 133.158,38.877 133.432,39.049 133.432 C 39.412 133.432,39.394 133.417,38.229 132.734 L 37.343 132.216 38.040 132.824 M42.377 135.228 C 42.579 135.555,44.292 136.471,44.435 136.328 C 44.490 136.273,44.011 135.941,43.371 135.590 C 42.731 135.240,42.284 135.077,42.377 135.228 M46.076 137.364 C 46.546 137.723,48.413 138.698,48.413 138.583 C 48.413 138.386,46.555 137.272,46.224 137.270 C 46.075 137.270,46.009 137.312,46.076 137.364 M49.594 139.155 C 49.594 139.359,51.676 140.599,51.804 140.472 C 51.866 140.410,51.394 140.059,50.755 139.691 C 50.117 139.324,49.594 139.083,49.594 139.155 M58.114 144.042 C 58.497 144.376,58.951 144.649,59.122 144.649 C 59.486 144.649,59.468 144.635,58.303 143.952 L 57.417 143.434 58.114 144.042 M63.256 146.967 C 64.356 147.585,65.412 148.246,65.603 148.437 C 65.793 148.627,66.073 148.782,66.224 148.782 C 66.376 148.782,66.183 148.540,65.796 148.243 C 64.856 147.524,61.840 145.829,61.514 145.836 C 61.371 145.840,62.155 146.348,63.256 146.967 M67.721 149.520 C 68.319 149.926,68.895 150.258,69.000 150.258 C 69.106 150.258,68.742 149.926,68.192 149.520 C 67.642 149.114,67.066 148.782,66.913 148.782 C 66.759 148.782,67.123 149.114,67.721 149.520 M69.397 150.348 C 69.465 150.397,69.919 150.670,70.406 150.956 L 71.292 151.474 70.595 150.866 C 70.211 150.532,69.757 150.258,69.586 150.258 C 69.415 150.258,69.330 150.299,69.397 150.348 M72.054 151.824 C 72.122 151.873,72.576 152.146,73.063 152.432 L 73.948 152.950 73.251 152.342 C 72.868 152.008,72.414 151.734,72.243 151.734 C 72.071 151.734,71.986 151.775,72.054 151.824 M74.982 153.520 C 76.005 154.215,76.589 154.417,75.867 153.827 C 75.461 153.495,74.996 153.223,74.834 153.221 C 74.672 153.220,74.738 153.355,74.982 153.520 M78.014 155.277 C 78.427 155.601,78.861 155.867,78.979 155.867 C 79.097 155.867,78.856 155.601,78.443 155.277 C 78.031 154.952,77.596 154.686,77.478 154.686 C 77.360 154.686,77.601 154.952,78.014 155.277 M80.671 156.753 C 81.084 157.077,81.518 157.343,81.636 157.343 C 81.754 157.343,81.513 157.077,81.100 156.753 C 80.687 156.428,80.253 156.162,80.135 156.162 C 80.017 156.162,80.258 156.428,80.671 156.753 M85.018 159.129 C 86.042 159.824,86.626 160.026,85.904 159.436 C 85.498 159.104,85.033 158.831,84.871 158.830 C 84.708 158.829,84.775 158.963,85.018 159.129 M87.675 160.605 C 88.699 161.300,89.282 161.502,88.561 160.912 C 88.155 160.580,87.690 160.307,87.528 160.306 C 87.365 160.305,87.432 160.439,87.675 160.605 M90.708 162.362 C 91.121 162.686,91.555 162.952,91.673 162.952 C 91.791 162.952,91.550 162.686,91.137 162.362 C 90.724 162.037,90.290 161.771,90.172 161.771 C 90.054 161.771,90.295 162.037,90.708 162.362 M93.365 163.838 C 93.778 164.162,94.212 164.428,94.330 164.428 C 94.448 164.428,94.207 164.162,93.794 163.838 C 93.381 163.513,92.947 163.247,92.829 163.247 C 92.711 163.247,92.952 163.513,93.365 163.838 M95.765 165.166 C 96.363 165.572,96.939 165.904,97.045 165.904 C 97.150 165.904,96.786 165.572,96.236 165.166 C 95.686 164.760,95.110 164.428,94.957 164.428 C 94.803 164.428,95.167 164.760,95.765 165.166 M98.366 166.642 C 98.963 167.048,99.556 167.380,99.684 167.380 C 99.811 167.380,99.427 167.048,98.830 166.642 C 98.232 166.236,97.639 165.904,97.512 165.904 C 97.384 165.904,97.769 166.236,98.366 166.642 M103.870 169.724 C 104.254 170.059,104.708 170.332,104.879 170.332 C 105.242 170.332,105.225 170.317,104.059 169.635 L 103.173 169.116 103.870 169.724 M106.273 171.070 C 106.823 171.476,107.399 171.808,107.552 171.808 C 107.706 171.808,107.342 171.476,106.744 171.070 C 106.146 170.664,105.570 170.332,105.465 170.332 C 105.359 170.332,105.723 170.664,106.273 171.070 M108.635 172.372 C 109.041 172.704,109.506 172.977,109.668 172.978 C 109.984 172.980,109.450 172.571,108.487 172.074 C 108.095 171.871,108.144 171.971,108.635 172.372 M110.701 173.399 C 110.701 173.602,112.783 174.843,112.911 174.715 C 112.973 174.653,112.501 174.302,111.862 173.935 C 111.224 173.567,110.701 173.326,110.701 173.399 M113.907 175.333 C 114.291 175.667,114.744 175.941,114.916 175.941 C 115.279 175.941,115.262 175.926,114.096 175.244 L 113.210 174.725 113.907 175.333 M116.564 176.809 C 116.947 177.143,117.401 177.417,117.573 177.417 C 117.936 177.417,117.918 177.402,116.753 176.720 L 115.867 176.201 116.564 176.809 M121.328 179.457 C 121.734 179.789,122.199 180.062,122.362 180.063 C 122.678 180.065,122.144 179.656,121.181 179.158 C 120.789 178.956,120.838 179.056,121.328 179.457 M126.601 182.418 C 126.984 182.752,127.438 183.026,127.610 183.026 C 127.973 183.026,127.955 183.011,126.790 182.329 L 125.904 181.810 126.601 182.418 M129.258 183.894 C 129.641 184.228,130.095 184.502,130.266 184.502 C 130.629 184.502,130.612 184.487,129.446 183.805 L 128.561 183.286 129.258 183.894 M0.625 184.565 C 0.584 185.162,1.452 185.692,2.416 185.659 C 3.145 185.634,2.984 185.543,1.719 185.265 C 1.284 185.170,0.868 184.859,0.794 184.575 C 0.669 184.099,0.656 184.098,0.625 184.565 M397.501 185.745 C 397.196 186.034,397.017 186.341,397.103 186.427 C 397.189 186.512,397.427 186.380,397.632 186.133 C 397.838 185.885,398.255 185.683,398.560 185.683 C 398.865 185.683,399.114 185.578,399.114 185.451 C 399.114 185.022,398.060 185.214,397.501 185.745 M133.595 186.298 C 133.797 186.625,135.510 187.541,135.653 187.398 C 135.708 187.343,135.229 187.011,134.589 186.661 C 133.949 186.310,133.501 186.147,133.595 186.298 M392.077 189.077 C 391.759 189.947,391.762 189.952,392.271 189.345 C 392.555 189.005,393.182 188.587,393.663 188.417 L 394.539 188.108 393.470 188.150 C 392.568 188.185,392.350 188.330,392.077 189.077 M389.373 190.056 C 389.373 190.294,389.140 190.665,388.856 190.881 C 388.545 191.117,388.485 191.276,388.706 191.282 C 388.908 191.287,389.238 191.026,389.441 190.701 C 389.644 190.376,390.102 190.111,390.459 190.111 C 391.537 190.111,391.459 189.670,390.377 189.646 C 389.682 189.630,389.373 189.757,389.373 190.056 M386.416 191.890 C 386.240 192.219,385.970 192.411,385.815 192.316 C 385.661 192.220,385.535 192.283,385.535 192.455 C 385.535 192.946,386.419 192.820,386.619 192.300 C 386.717 192.043,387.078 191.719,387.421 191.581 C 388.042 191.330,388.042 191.329,387.390 191.310 C 387.022 191.300,386.597 191.553,386.416 191.890 M13.710 192.334 C 14.025 192.572,14.490 192.763,14.743 192.757 C 15.038 192.750,14.938 192.595,14.465 192.325 C 13.499 191.773,12.976 191.779,13.710 192.334 M382.150 194.508 C 382.039 194.859,381.580 195.141,380.919 195.265 C 380.340 195.374,379.931 195.528,380.011 195.608 C 380.331 195.928,382.110 195.213,382.517 194.601 C 382.769 194.221,382.820 193.948,382.639 193.948 C 382.468 193.948,382.248 194.200,382.150 194.508 M150.578 195.809 C 150.646 195.858,151.100 196.132,151.587 196.417 L 152.472 196.935 151.775 196.327 C 151.392 195.993,150.938 195.720,150.767 195.720 C 150.595 195.720,150.510 195.760,150.578 195.809 M376.679 197.237 C 376.679 197.422,376.446 197.762,376.162 197.993 C 375.823 198.269,375.789 198.376,376.063 198.305 C 376.611 198.163,377.462 196.900,377.010 196.900 C 376.828 196.900,376.679 197.052,376.679 197.237 M23.326 197.358 C 23.318 197.867,23.988 198.378,24.635 198.356 C 25.176 198.339,25.161 198.300,24.502 197.996 C 24.096 197.808,23.666 197.518,23.547 197.351 C 23.400 197.145,23.329 197.147,23.326 197.358 M153.235 197.285 C 153.303 197.334,153.756 197.608,154.244 197.893 L 155.129 198.411 154.432 197.803 C 154.049 197.469,153.595 197.196,153.424 197.196 C 153.252 197.196,153.167 197.236,153.235 197.285 M155.301 198.473 C 155.803 198.866,157.638 199.871,157.638 199.753 C 157.638 199.562,155.723 198.376,155.414 198.376 C 155.284 198.376,155.234 198.420,155.301 198.473 M373.881 198.960 C 373.590 199.281,373.238 199.472,373.097 199.385 C 372.956 199.298,372.841 199.368,372.841 199.540 C 372.841 200.049,373.663 199.896,374.079 199.309 C 374.291 199.010,374.664 198.688,374.908 198.594 C 375.285 198.448,375.281 198.420,374.880 198.400 C 374.621 198.387,374.171 198.639,373.881 198.960 M157.958 199.949 C 158.460 200.342,160.295 201.347,160.295 201.229 C 160.295 201.038,158.380 199.852,158.071 199.852 C 157.941 199.852,157.891 199.896,157.958 199.949 M371.962 200.288 C 371.756 200.536,371.339 200.738,371.034 200.738 C 370.729 200.738,370.480 200.864,370.480 201.018 C 370.480 201.355,372.169 200.814,372.429 200.394 C 372.733 199.902,372.354 199.816,371.962 200.288 M369.344 201.790 C 369.147 202.222,369.126 202.468,369.295 202.364 C 369.728 202.096,370.249 201.033,369.947 201.033 C 369.805 201.033,369.534 201.374,369.344 201.790 M160.615 201.418 C 160.683 201.467,161.137 201.740,161.624 202.026 L 162.509 202.544 161.812 201.936 C 161.429 201.602,160.975 201.328,160.804 201.328 C 160.632 201.328,160.547 201.369,160.615 201.418 M364.013 203.968 C 363.787 204.108,363.712 204.373,363.841 204.581 C 364.010 204.855,364.138 204.820,364.348 204.444 C 364.690 203.834,364.550 203.636,364.013 203.968 M38.633 205.961 C 38.989 206.646,39.511 207.081,39.723 206.870 C 39.793 206.800,39.500 206.421,39.073 206.028 C 38.332 205.347,38.312 205.344,38.633 205.961 M361.337 206.214 C 360.232 206.994,360.272 207.137,361.446 206.602 C 361.850 206.418,362.251 206.086,362.336 205.864 C 362.530 205.360,362.563 205.348,361.337 206.214 M40.738 207.161 C 40.738 207.285,41.007 207.553,41.335 207.759 C 41.889 208.104,41.905 208.088,41.559 207.534 C 41.188 206.939,40.738 206.735,40.738 207.161 M359.188 207.552 C 358.904 207.863,358.784 208.118,358.921 208.118 C 359.058 208.118,359.411 207.852,359.705 207.528 C 359.999 207.203,360.119 206.948,359.972 206.962 C 359.825 206.975,359.472 207.241,359.188 207.552 M357.065 208.327 C 356.985 208.535,356.484 208.971,355.951 209.296 C 355.283 209.703,355.147 209.887,355.512 209.888 C 355.804 209.889,356.351 209.557,356.727 209.151 C 357.103 208.745,357.554 208.413,357.729 208.413 C 357.903 208.413,358.111 208.309,358.190 208.181 C 358.269 208.054,358.080 207.949,357.772 207.949 C 357.463 207.949,357.145 208.119,357.065 208.327 M45.039 209.716 C 45.537 209.951,46.118 210.351,46.329 210.606 C 46.541 210.861,46.838 211.070,46.989 211.070 C 47.139 211.070,46.905 210.738,46.467 210.332 C 46.029 209.926,45.568 209.594,45.442 209.594 C 45.317 209.594,44.971 209.526,44.674 209.442 C 44.376 209.359,44.540 209.482,45.039 209.716 M176.946 210.627 C 177.544 211.033,178.120 211.365,178.225 211.365 C 178.331 211.365,177.967 211.033,177.417 210.627 C 176.867 210.221,176.291 209.889,176.138 209.889 C 175.984 209.889,176.348 210.221,176.946 210.627 M351.160 211.391 C 351.235 211.513,351.066 211.844,350.783 212.127 C 350.440 212.470,350.406 212.595,350.681 212.504 C 351.351 212.280,351.996 211.169,351.455 211.169 C 351.217 211.169,351.084 211.269,351.160 211.391 M184.531 214.902 C 185.246 215.387,185.950 215.785,186.096 215.788 C 186.242 215.791,185.777 215.397,185.063 214.913 C 184.348 214.429,183.644 214.030,183.498 214.028 C 183.352 214.025,183.817 214.418,184.531 214.902 M344.049 215.867 L 343.581 216.827 344.182 216.089 C 344.762 215.378,344.951 214.908,344.657 214.908 C 344.580 214.908,344.306 215.339,344.049 215.867 M341.845 216.728 C 341.845 216.864,342.199 216.974,342.632 216.974 C 343.065 216.974,343.328 216.883,343.217 216.771 C 342.920 216.475,341.845 216.441,341.845 216.728 M340.964 217.638 C 340.968 218.175,341.023 218.218,341.255 217.860 C 341.624 217.287,341.624 216.974,341.255 216.974 C 341.092 216.974,340.961 217.273,340.964 217.638 M60.812 218.374 C 61.055 218.468,61.432 218.757,61.648 219.015 C 62.000 219.435,62.023 219.427,61.869 218.943 C 61.775 218.645,61.697 218.346,61.697 218.278 C 61.697 218.211,61.399 218.165,61.033 218.178 C 60.585 218.194,60.513 218.257,60.812 218.374 M336.679 219.926 C 336.383 220.253,336.208 220.587,336.289 220.668 C 336.370 220.749,336.678 220.548,336.974 220.221 C 337.270 219.895,337.445 219.561,337.364 219.480 C 337.283 219.399,336.975 219.599,336.679 219.926 M64.316 220.131 C 64.501 220.487,64.794 220.866,64.966 220.973 C 65.554 221.336,65.421 220.961,64.700 220.221 C 64.048 219.553,64.012 219.544,64.316 220.131 M333.897 220.932 C 333.708 221.160,333.230 221.312,332.836 221.269 C 332.409 221.222,331.908 221.432,331.595 221.789 C 331.088 222.368,331.090 222.380,331.661 222.157 C 332.902 221.671,333.301 221.639,333.729 221.994 C 334.216 222.399,334.342 223.019,333.878 222.733 C 333.710 222.629,333.661 222.748,333.763 223.014 C 333.898 223.364,333.808 223.428,333.391 223.281 C 332.950 223.125,332.912 223.163,333.198 223.472 C 333.476 223.772,333.648 223.779,333.979 223.505 C 334.447 223.116,334.791 221.107,334.388 221.107 C 334.249 221.107,334.217 220.974,334.317 220.812 C 334.590 220.371,334.293 220.456,333.897 220.932 M66.570 221.104 C 66.471 221.264,66.571 221.326,66.793 221.241 C 67.332 221.034,68.309 222.148,68.089 222.720 C 67.984 222.993,67.531 223.182,66.947 223.194 C 66.137 223.212,66.075 223.257,66.568 223.469 C 68.244 224.189,69.121 223.348,68.217 221.886 C 67.565 220.831,66.927 220.527,66.570 221.104 M197.745 222.270 C 198.128 222.605,198.582 222.878,198.753 222.878 C 199.117 222.878,199.099 222.863,197.934 222.181 L 197.048 221.662 197.745 222.270 M330.923 222.819 C 330.923 223.125,331.562 223.764,331.867 223.764 C 331.997 223.764,332.103 223.631,332.103 223.469 C 332.103 223.306,331.937 223.207,331.734 223.247 C 331.531 223.288,331.399 223.155,331.439 222.952 C 331.480 222.749,331.380 222.583,331.218 222.583 C 331.055 222.583,330.923 222.689,330.923 222.819 M326.199 224.059 C 326.199 224.772,325.843 224.987,325.300 224.602 C 324.951 224.355,324.968 224.330,325.392 224.466 C 325.815 224.603,325.888 224.496,325.779 223.898 C 325.704 223.483,325.767 223.236,325.923 223.332 C 326.075 223.427,326.199 223.753,326.199 224.059 M72.547 224.382 C 73.529 225.423,73.582 225.435,73.168 224.527 C 72.989 224.135,72.594 223.749,72.290 223.669 C 71.848 223.554,71.900 223.697,72.547 224.382 M74.170 225.443 C 74.454 225.518,74.919 225.518,75.203 225.443 C 75.487 225.369,75.255 225.308,74.686 225.308 C 74.118 225.308,73.886 225.369,74.170 225.443 M321.818 227.968 C 321.685 228.101,321.255 228.079,320.862 227.919 C 320.189 227.645,320.203 227.631,321.104 227.677 C 321.629 227.704,321.951 227.835,321.818 227.968 M80.288 228.409 C 80.690 228.484,81.195 228.798,81.412 229.107 C 81.628 229.415,82.030 229.659,82.305 229.649 C 82.668 229.636,82.623 229.557,82.140 229.363 C 81.775 229.217,81.476 228.893,81.476 228.644 C 81.476 228.322,81.199 228.203,80.517 228.232 C 79.715 228.266,79.677 228.295,80.288 228.409 M319.114 228.782 C 319.114 228.964,318.981 229.030,318.817 228.928 C 318.653 228.827,318.312 228.952,318.058 229.206 C 317.804 229.460,317.712 229.668,317.853 229.668 C 317.995 229.668,318.255 229.523,318.432 229.347 C 318.663 229.116,318.808 229.116,318.951 229.347 C 319.060 229.523,319.274 229.668,319.427 229.668 C 319.797 229.668,319.784 228.866,319.410 228.635 C 319.247 228.534,319.114 228.601,319.114 228.782 M85.081 231.302 C 86.052 232.458,86.292 232.620,87.032 232.615 C 87.611 232.612,87.711 232.540,87.407 232.348 C 87.178 232.203,86.823 232.149,86.617 232.228 C 86.411 232.306,86.019 232.029,85.744 231.610 C 85.470 231.191,85.123 230.849,84.973 230.849 C 84.823 230.849,84.871 231.053,85.081 231.302 M311.144 233.432 C 311.144 233.662,310.986 233.797,310.793 233.733 C 310.258 233.555,310.183 233.014,310.693 233.014 C 310.941 233.014,311.144 233.202,311.144 233.432 M310.258 234.278 C 310.258 234.818,310.152 234.794,309.539 234.116 C 309.044 233.570,309.048 233.553,309.641 233.708 C 309.980 233.797,310.258 234.053,310.258 234.278 M303.552 236.076 C 303.466 236.299,303.512 236.461,303.654 236.435 C 304.253 236.325,304.356 236.493,304.046 237.072 C 303.729 237.664,303.701 237.667,303.297 237.146 C 302.919 236.660,302.895 236.658,303.057 237.122 C 303.156 237.406,303.097 237.638,302.927 237.638 C 302.756 237.638,302.686 237.339,302.771 236.974 C 302.856 236.609,302.937 236.166,302.951 235.990 C 302.965 235.814,303.141 235.670,303.342 235.670 C 303.543 235.670,303.637 235.853,303.552 236.076 M306.359 235.734 C 305.922 236.427,306.662 236.935,307.222 236.326 C 307.641 235.869,307.648 235.827,307.257 236.120 C 306.846 236.428,306.748 236.401,306.660 235.957 C 306.599 235.649,306.472 235.555,306.359 235.734 M301.266 238.241 C 301.709 238.731,301.723 238.810,301.339 238.663 C 301.019 238.540,300.800 238.688,300.664 239.115 C 300.441 239.817,300.218 239.745,300.099 238.931 C 300.039 238.526,300.389 237.771,300.692 237.650 C 300.708 237.643,300.966 237.910,301.266 238.241 M296.304 240.746 C 296.249 241.156,296.112 241.488,295.999 241.484 C 295.886 241.479,295.661 241.476,295.498 241.476 C 295.336 241.476,295.203 241.335,295.203 241.163 C 295.203 240.991,295.321 240.924,295.465 241.012 C 295.608 241.101,295.795 240.910,295.880 240.587 C 296.101 239.743,296.422 239.863,296.304 240.746 M299.786 240.478 C 299.523 240.741,299.218 240.866,299.109 240.757 C 299.000 240.648,299.106 240.435,299.344 240.284 C 300.042 239.843,300.305 239.959,299.786 240.478 M294.613 242.657 C 294.613 242.986,294.416 243.247,294.167 243.247 C 293.796 243.247,293.783 243.149,294.091 242.657 C 294.293 242.332,294.494 242.066,294.536 242.066 C 294.578 242.066,294.613 242.332,294.613 242.657 M105.092 242.476 C 105.092 242.538,105.484 242.647,105.962 242.718 C 106.441 242.788,106.765 242.736,106.683 242.603 C 106.537 242.367,105.092 242.251,105.092 242.476 M113.662 246.990 C 113.651 247.440,114.479 248.268,114.929 248.257 C 115.120 248.252,115.049 248.115,114.770 247.952 C 114.491 247.790,114.129 247.428,113.967 247.149 C 113.804 246.870,113.667 246.799,113.662 246.990 M283.985 247.380 C 283.985 247.707,284.629 247.654,284.888 247.306 C 284.979 247.185,285.311 247.291,285.626 247.543 C 286.186 247.990,286.184 247.997,285.560 247.826 C 285.208 247.730,284.834 247.792,284.728 247.963 C 284.622 248.135,284.420 248.205,284.280 248.118 C 284.141 248.032,283.941 248.098,283.838 248.266 C 283.734 248.433,283.492 248.476,283.301 248.361 C 283.078 248.228,283.090 248.323,283.335 248.626 C 283.895 249.317,283.355 249.481,282.582 248.855 C 281.809 248.229,281.744 247.970,282.362 247.970 C 282.605 247.970,282.804 247.823,282.804 247.644 C 282.804 247.464,283.011 247.396,283.263 247.493 C 283.525 247.594,283.644 247.544,283.540 247.377 C 283.441 247.216,283.501 247.085,283.673 247.085 C 283.845 247.085,283.985 247.218,283.985 247.380 M281.033 249.246 C 281.033 249.391,280.834 249.433,280.590 249.340 C 280.289 249.224,280.148 249.356,280.148 249.751 C 280.148 250.071,280.001 250.332,279.821 250.332 C 279.641 250.332,279.575 250.122,279.673 249.865 C 279.772 249.608,279.852 249.284,279.852 249.145 C 279.852 249.007,280.118 248.913,280.443 248.937 C 280.768 248.962,281.033 249.101,281.033 249.246 M118.155 249.650 C 118.439 249.724,118.904 249.724,119.188 249.650 C 119.472 249.576,119.240 249.515,118.672 249.515 C 118.103 249.515,117.871 249.576,118.155 249.650 M278.414 251.716 C 278.769 252.152,278.755 252.190,278.303 252.020 C 278.018 251.914,277.786 251.955,277.786 252.113 C 277.786 252.539,278.550 252.458,278.938 251.990 C 279.200 251.674,279.170 251.541,278.803 251.400 C 278.059 251.114,277.978 251.180,278.414 251.716 M84.997 252.160 C 84.863 252.716,84.730 253.662,84.800 253.561 C 84.850 253.490,85.058 253.211,85.264 252.941 C 85.516 252.610,85.537 252.389,85.328 252.260 C 85.158 252.155,85.009 252.110,84.997 252.160 M123.709 252.731 C 123.685 253.338,124.435 253.979,124.935 253.778 C 125.169 253.684,125.113 253.617,124.788 253.603 C 124.498 253.590,124.141 253.280,123.994 252.915 C 123.814 252.466,123.721 252.406,123.709 252.731 M86.790 253.610 C 86.790 253.744,87.055 253.996,87.380 254.170 C 88.095 254.552,88.141 255.009,87.490 255.258 C 87.181 255.377,86.819 255.191,86.477 254.737 C 86.184 254.349,85.847 254.129,85.727 254.248 C 85.608 254.367,85.673 254.465,85.872 254.465 C 86.071 254.465,86.159 254.586,86.068 254.734 C 85.787 255.189,86.234 255.941,86.785 255.941 C 87.073 255.941,87.493 256.220,87.719 256.560 C 88.191 257.271,90.700 257.720,91.049 257.156 C 91.439 256.525,91.779 256.833,91.667 257.717 C 91.604 258.217,91.675 258.532,91.829 258.437 C 91.980 258.344,92.103 258.408,92.103 258.580 C 92.103 258.752,92.337 258.893,92.623 258.893 C 92.908 258.893,93.308 259.159,93.511 259.483 C 93.714 259.808,94.057 260.074,94.274 260.074 C 94.491 260.074,94.909 260.339,95.203 260.664 C 95.497 260.989,95.900 261.255,96.100 261.255 C 96.299 261.255,96.536 261.534,96.625 261.876 C 96.714 262.218,96.954 262.442,97.158 262.374 C 97.802 262.160,97.799 261.517,97.153 261.348 C 96.811 261.259,96.531 261.023,96.531 260.823 C 96.531 260.624,96.266 260.220,95.941 259.926 C 95.616 259.632,95.351 259.214,95.351 258.997 C 95.351 258.780,95.085 258.437,94.760 258.234 C 94.435 258.031,94.170 257.629,94.170 257.340 C 94.170 256.686,92.658 255.902,92.472 256.459 C 92.288 257.011,91.218 256.336,91.218 255.667 C 91.218 255.055,90.226 254.689,89.254 254.943 C 88.778 255.067,88.595 254.938,88.455 254.377 C 88.283 253.694,86.790 253.006,86.790 253.610 M90.332 256.215 C 90.332 256.558,89.702 256.779,89.225 256.604 C 88.617 256.380,88.807 256.074,89.594 256.009 C 90.000 255.975,90.332 256.068,90.332 256.215 M267.584 257.236 C 267.449 257.773,267.261 257.902,266.794 257.779 C 266.377 257.671,266.248 257.729,266.392 257.961 C 266.508 258.149,266.935 258.303,267.341 258.303 C 267.806 258.303,268.004 258.181,267.877 257.976 C 267.742 257.758,267.876 257.713,268.278 257.840 C 268.955 258.055,269.451 257.525,268.997 257.070 C 268.800 256.874,268.635 256.882,268.503 257.096 C 268.394 257.273,268.163 257.417,267.991 257.417 C 267.793 257.417,267.813 257.253,268.044 256.974 C 268.291 256.677,268.305 256.531,268.086 256.531 C 267.907 256.531,267.681 256.848,267.584 257.236 M93.524 257.635 C 93.410 258.225,92.734 258.423,92.139 258.040 C 91.561 257.668,92.002 257.122,92.880 257.122 C 93.427 257.122,93.597 257.257,93.524 257.635 M130.954 257.540 C 131.060 257.816,131.328 257.971,131.551 257.886 C 131.774 257.801,131.956 257.859,131.956 258.017 C 131.956 258.174,132.362 258.303,132.859 258.303 C 133.424 258.303,133.689 258.185,133.567 257.987 C 133.460 257.814,133.169 257.750,132.922 257.845 C 132.674 257.940,132.289 257.866,132.066 257.681 C 131.843 257.496,131.661 257.444,131.661 257.565 C 131.661 257.686,131.458 257.617,131.211 257.411 C 130.834 257.098,130.792 257.119,130.954 257.540 M136.646 260.295 C 136.838 260.661,137.212 260.959,137.477 260.959 C 137.741 260.959,137.903 260.925,137.835 260.882 C 137.768 260.840,137.394 260.541,137.005 260.218 L 136.298 259.631 136.646 260.295 M142.011 262.463 C 141.994 262.908,142.572 263.563,143.395 264.032 C 143.598 264.147,143.764 264.116,143.764 263.963 C 143.764 263.810,143.499 263.616,143.174 263.531 C 142.850 263.446,142.460 263.065,142.307 262.685 C 142.134 262.253,142.023 262.170,142.011 262.463 M259.153 262.362 C 259.134 262.483,259.130 262.670,259.144 262.776 C 259.158 262.882,258.974 263.131,258.736 263.329 C 258.432 263.581,258.303 263.589,258.303 263.357 C 258.303 263.175,258.103 263.026,257.860 263.026 C 257.616 263.026,257.417 263.140,257.417 263.280 C 257.417 263.420,257.085 263.499,256.679 263.454 C 256.114 263.392,255.941 263.509,255.941 263.955 C 255.941 264.275,255.810 264.456,255.649 264.356 C 255.482 264.253,255.432 264.371,255.533 264.634 C 255.793 265.311,256.200 265.191,256.404 264.377 C 256.560 263.759,256.714 263.683,257.539 263.817 C 258.549 263.981,259.483 263.378,259.483 262.562 C 259.483 262.128,259.216 261.966,259.153 262.362 M100.678 264.043 C 100.190 264.631,100.474 265.330,101.333 265.656 C 101.709 265.799,102.195 266.131,102.413 266.394 C 102.719 266.762,102.902 266.793,103.220 266.530 C 103.568 266.241,103.555 266.104,103.133 265.638 C 102.859 265.336,102.487 264.791,102.307 264.429 C 101.901 263.614,101.176 263.443,100.678 264.043 M145.240 265.092 C 144.546 265.314,144.560 265.330,145.479 265.358 C 146.061 265.376,146.382 265.268,146.273 265.092 C 146.173 264.930,146.065 264.810,146.034 264.826 C 146.003 264.843,145.646 264.962,145.240 265.092 M251.626 266.947 C 251.743 266.830,251.746 266.977,251.632 267.274 C 251.445 267.762,251.399 267.767,251.156 267.332 C 251.007 267.068,250.784 266.914,250.658 266.992 C 250.533 267.069,250.431 266.939,250.431 266.702 C 250.431 266.329,250.497 266.331,250.922 266.715 C 251.192 266.960,251.509 267.064,251.626 266.947 M105.295 267.054 C 104.877 267.472,105.114 268.044,105.704 268.044 C 106.117 268.044,106.285 267.884,106.221 267.552 C 106.116 267.009,105.612 266.738,105.295 267.054 M248.711 268.048 C 248.810 268.208,248.745 268.339,248.567 268.339 C 248.358 268.339,248.378 268.486,248.623 268.750 C 248.899 269.047,249.063 269.067,249.221 268.823 C 249.545 268.320,249.494 268.126,248.988 267.932 C 248.726 267.831,248.607 267.880,248.711 268.048 M319.328 268.084 C 318.181 268.726,319.201 270.401,320.361 269.780 C 320.650 269.626,320.886 269.243,320.886 268.930 C 320.886 268.187,320.002 267.707,319.328 268.084 M314.519 269.491 C 313.809 270.201,314.752 271.587,315.946 271.587 C 317.603 271.587,318.564 270.400,317.565 269.588 C 317.212 269.302,314.785 269.225,314.519 269.491 M316.605 270.402 C 316.605 270.927,315.631 271.174,315.212 270.755 C 315.049 270.591,315.009 270.305,315.124 270.120 C 315.417 269.645,316.605 269.871,316.605 270.402 M307.295 271.174 C 307.134 271.596,306.706 272.185,306.343 272.484 C 305.809 272.922,305.745 273.128,306.008 273.561 C 306.427 274.252,307.840 274.439,308.072 273.835 C 308.174 273.570,308.808 273.303,309.620 273.184 C 311.799 272.864,312.379 272.565,312.271 271.815 C 312.052 270.286,307.839 269.743,307.295 271.174 M309.452 271.409 C 309.546 271.315,309.866 271.373,310.162 271.539 C 310.653 271.814,310.629 271.868,309.892 272.148 C 308.974 272.497,308.315 272.334,308.070 271.696 C 307.977 271.451,308.031 271.340,308.195 271.441 C 308.356 271.540,308.487 271.465,308.487 271.273 C 308.487 271.014,308.590 271.009,308.883 271.253 C 309.101 271.434,309.357 271.504,309.452 271.409 M111.917 272.701 C 111.545 273.396,112.030 274.244,112.800 274.244 C 113.126 274.244,113.312 274.112,113.212 273.952 C 113.109 273.784,113.227 273.735,113.490 273.836 C 114.019 274.039,114.084 273.573,113.643 272.748 C 113.260 272.033,112.289 272.007,111.917 272.701 M303.093 274.216 C 302.810 274.966,302.654 275.056,301.851 274.925 C 300.771 274.750,300.127 275.339,300.273 276.368 C 300.401 277.272,302.068 277.486,302.928 276.707 C 303.250 276.416,303.935 276.041,304.451 275.875 C 306.041 275.361,305.798 273.358,304.145 273.358 C 303.613 273.358,303.330 273.588,303.093 274.216 M304.797 274.535 C 304.797 274.750,304.578 274.957,304.311 274.997 C 303.880 275.060,303.832 274.887,304.036 273.998 C 304.102 273.712,304.797 274.204,304.797 274.535 M164.723 275.417 C 164.723 275.751,165.573 276.605,165.905 276.605 C 166.045 276.605,166.244 276.873,166.348 277.200 C 166.452 277.527,166.660 277.718,166.811 277.625 C 166.962 277.532,167.085 277.597,167.085 277.769 C 167.085 277.940,167.439 278.081,167.872 278.081 C 168.653 278.081,168.685 277.816,167.924 277.661 C 167.091 277.491,166.504 277.123,166.661 276.869 C 166.751 276.724,166.678 276.605,166.498 276.605 C 166.319 276.605,165.846 276.279,165.448 275.881 C 165.049 275.482,164.723 275.273,164.723 275.417 M235.572 275.671 C 235.572 276.010,235.655 276.018,236.022 275.714 C 236.402 275.398,236.443 275.426,236.289 275.899 C 236.139 276.359,236.163 276.379,236.425 276.015 C 236.892 275.366,236.825 275.160,236.162 275.210 C 235.838 275.235,235.572 275.442,235.572 275.671 M234.745 275.779 C 234.192 276.332,234.325 276.605,235.147 276.605 C 235.583 276.605,235.824 276.479,235.717 276.305 C 235.615 276.140,235.409 276.081,235.260 276.173 C 235.110 276.265,235.067 276.134,235.164 275.882 C 235.375 275.334,235.227 275.297,234.745 275.779 M232.190 276.290 C 232.096 276.441,232.155 276.648,232.320 276.750 C 232.485 276.852,232.620 277.193,232.620 277.508 C 232.620 278.174,232.996 278.252,233.467 277.685 C 233.723 277.376,233.620 277.208,233.002 276.926 C 232.366 276.637,232.293 276.511,232.635 276.294 C 232.901 276.126,232.930 276.022,232.711 276.019 C 232.518 276.017,232.283 276.138,232.190 276.290 M296.593 276.245 C 296.302 276.307,295.994 276.712,295.907 277.146 C 295.767 277.848,295.617 277.934,294.518 277.934 C 293.411 277.934,293.281 278.009,293.243 278.672 C 293.152 280.268,294.570 280.642,296.035 279.410 C 296.549 278.977,297.283 278.672,297.808 278.672 C 299.167 278.672,300.222 277.301,299.301 276.731 C 298.781 276.410,297.174 276.121,296.593 276.245 M230.947 277.302 C 231.207 277.157,231.206 277.201,230.946 277.483 C 230.755 277.689,230.668 278.074,230.752 278.339 C 230.847 278.639,230.811 278.698,230.655 278.496 C 230.518 278.318,230.007 278.069,229.520 277.943 C 229.033 277.816,228.802 277.652,229.006 277.577 C 229.209 277.502,229.302 277.319,229.210 277.171 C 229.119 277.023,229.395 277.036,229.823 277.199 C 230.252 277.362,230.758 277.408,230.947 277.302 M229.523 278.381 C 229.625 278.546,229.866 278.603,230.057 278.507 C 230.249 278.411,230.140 278.547,229.815 278.810 C 229.491 279.073,229.258 279.348,229.299 279.422 C 229.454 279.705,229.363 280.148,229.151 280.147 C 229.030 280.146,228.920 279.681,228.908 279.114 C 228.886 278.103,229.154 277.784,229.523 278.381 M294.908 278.967 C 294.908 279.292,294.716 279.557,294.482 279.557 C 293.961 279.557,293.627 279.071,293.875 278.672 C 294.196 278.152,294.908 278.356,294.908 278.967 M170.775 279.238 C 170.267 279.437,170.314 279.488,171.114 279.605 C 171.796 279.705,172.003 279.639,171.894 279.354 C 171.727 278.921,171.618 278.910,170.775 279.238 M289.063 279.321 C 288.868 279.516,288.709 279.881,288.709 280.133 C 288.709 280.474,288.391 280.590,287.457 280.590 C 286.672 280.590,286.189 280.728,286.165 280.959 C 286.143 281.162,286.109 281.454,286.089 281.607 C 286.068 281.761,285.421 281.927,284.649 281.976 C 283.442 282.054,283.234 282.161,283.151 282.746 C 283.075 283.282,282.887 283.414,282.265 283.366 C 280.810 283.255,280.455 283.391,280.269 284.131 C 280.120 284.724,279.952 284.833,279.399 284.694 C 278.415 284.447,277.491 284.820,277.491 285.465 C 277.491 285.917,277.232 286.036,276.089 286.109 C 274.838 286.190,274.677 286.280,274.599 286.944 C 274.520 287.621,274.408 287.678,273.352 287.578 C 272.346 287.482,272.147 287.566,271.853 288.210 C 271.667 288.619,271.256 289.021,270.940 289.104 C 270.489 289.222,270.385 289.466,270.459 290.236 C 270.578 291.468,272.382 291.923,272.677 290.795 C 272.783 290.389,273.077 290.185,273.553 290.185 C 273.948 290.185,274.602 289.852,275.008 289.446 C 275.457 288.998,276.083 288.708,276.603 288.708 C 277.108 288.708,277.787 288.405,278.257 287.970 C 278.695 287.565,279.299 287.232,279.600 287.232 C 279.901 287.232,280.406 286.974,280.722 286.658 C 281.039 286.341,281.842 285.936,282.509 285.757 C 283.175 285.577,283.789 285.251,283.873 285.032 C 283.957 284.813,284.482 284.548,285.040 284.443 C 285.598 284.339,286.286 284.009,286.569 283.711 C 286.853 283.412,287.523 283.075,288.058 282.960 C 288.594 282.845,289.190 282.498,289.384 282.187 C 289.596 281.849,290.069 281.624,290.570 281.624 C 291.803 281.624,292.546 281.118,292.546 280.278 C 292.546 279.151,289.946 278.437,289.063 279.321 M290.972 280.058 C 290.972 280.777,289.924 281.485,289.513 281.042 C 289.222 280.728,289.238 280.700,289.594 280.899 C 289.959 281.103,289.973 281.068,289.675 280.699 C 289.411 280.373,289.401 280.164,289.639 279.926 C 290.075 279.490,290.972 279.579,290.972 280.058 M288.487 281.304 C 288.898 281.349,288.712 282.149,288.250 282.327 C 287.949 282.442,287.855 282.378,287.977 282.137 C 288.079 281.936,287.951 282.031,287.694 282.348 C 287.262 282.881,287.190 282.888,286.746 282.445 C 286.037 281.736,286.445 280.981,287.449 281.146 C 287.898 281.220,288.365 281.291,288.487 281.304 M175.055 281.771 C 175.257 282.015,175.639 282.199,175.903 282.180 C 176.309 282.151,176.303 282.124,175.867 282.011 C 175.583 281.936,175.351 281.752,175.351 281.602 C 175.351 281.452,175.201 281.328,175.019 281.328 C 174.790 281.328,174.801 281.465,175.055 281.771 M285.113 282.804 C 285.401 283.129,285.448 283.137,285.290 282.833 C 285.149 282.560,285.192 282.490,285.416 282.629 C 285.603 282.744,285.756 283.053,285.756 283.314 C 285.756 283.575,285.680 283.712,285.587 283.619 C 285.493 283.525,285.030 283.560,284.557 283.695 C 283.553 283.983,283.232 283.659,283.685 282.813 C 284.041 282.148,284.529 282.145,285.113 282.804 M178.916 283.743 C 178.883 284.461,179.703 285.166,180.574 285.166 C 181.220 285.166,181.273 285.101,180.948 284.709 C 180.663 284.367,180.514 284.342,180.348 284.610 C 180.104 285.004,179.432 284.501,179.111 283.685 C 178.972 283.330,178.935 283.341,178.916 283.743 M282.534 284.117 C 282.683 284.025,282.804 284.246,282.804 284.607 C 282.804 284.969,282.728 285.188,282.635 285.095 C 282.541 285.001,282.101 285.029,281.656 285.157 C 280.952 285.359,280.849 285.307,280.866 284.761 C 280.885 284.145,281.964 283.548,282.165 284.042 C 282.220 284.175,282.386 284.209,282.534 284.117 M125.003 284.306 C 124.745 284.723,125.314 285.292,125.731 285.034 C 125.907 284.925,126.052 284.645,126.052 284.411 C 126.052 283.914,125.292 283.838,125.003 284.306 M279.425 285.461 C 279.253 285.152,279.343 285.174,279.724 285.533 C 280.180 285.963,280.204 286.108,279.870 286.419 C 279.548 286.718,279.513 286.714,279.692 286.399 C 279.876 286.076,279.807 286.075,279.300 286.391 C 278.476 286.906,277.780 286.327,278.369 285.618 C 278.680 285.243,278.834 285.227,279.210 285.531 C 279.594 285.842,279.630 285.831,279.425 285.461 M183.395 286.550 C 183.679 286.625,184.144 286.625,184.428 286.550 C 184.712 286.476,184.480 286.415,183.911 286.415 C 183.343 286.415,183.111 286.476,183.395 286.550 M276.902 287.673 C 276.742 287.867,276.670 288.084,276.742 288.157 C 276.815 288.229,276.458 288.279,275.949 288.266 C 274.795 288.239,274.607 287.755,275.430 286.932 C 276.156 286.206,277.540 286.904,276.902 287.673 M185.978 287.937 C 185.978 288.000,186.369 288.109,186.848 288.179 C 187.326 288.249,187.651 288.198,187.568 288.065 C 187.422 287.828,185.978 287.712,185.978 287.937 M273.653 288.407 C 274.041 288.652,274.032 288.751,273.581 289.202 C 272.984 289.800,272.272 289.362,272.571 288.581 C 272.775 288.051,273.026 288.011,273.653 288.407 M213.567 288.729 C 213.460 288.902,213.186 288.973,212.959 288.885 C 212.732 288.798,212.546 288.856,212.546 289.013 C 212.546 289.454,213.316 289.351,213.727 288.856 C 213.929 288.613,214.020 288.413,213.928 288.413 C 213.837 288.413,213.674 288.555,213.567 288.729 M210.627 289.498 C 210.659 289.939,210.514 290.128,210.166 290.102 C 209.881 290.080,209.723 289.897,209.806 289.681 C 209.890 289.463,209.742 289.299,209.461 289.299 C 209.190 289.299,209.045 289.423,209.139 289.574 C 209.232 289.725,209.185 289.925,209.034 290.018 C 208.715 290.215,208.764 289.620,209.114 289.061 C 209.495 288.450,210.574 288.762,210.627 289.498 M207.397 290.118 C 207.312 290.204,207.472 290.445,207.754 290.654 C 208.239 291.014,208.239 291.061,207.749 291.558 C 207.419 291.893,207.232 291.949,207.232 291.713 C 207.232 291.446,207.082 291.425,206.685 291.638 C 206.212 291.891,206.142 291.821,206.168 291.131 C 206.205 290.181,206.638 289.611,207.170 289.815 C 207.381 289.896,207.483 290.032,207.397 290.118 M272.280 290.328 C 272.386 290.249,272.402 290.277,272.316 290.390 C 271.827 291.033,270.753 290.521,271.172 289.845 C 271.320 289.605,271.486 289.647,271.735 289.988 C 271.929 290.253,272.174 290.406,272.280 290.328 M268.158 290.706 C 267.686 291.017,267.343 292.251,267.729 292.251 C 267.902 292.251,268.044 292.443,268.044 292.678 C 268.044 293.025,268.211 293.048,268.930 292.797 C 269.629 292.553,269.815 292.315,269.815 291.663 C 269.815 290.673,268.958 290.178,268.158 290.706 M204.980 292.430 C 204.870 292.737,204.726 293.089,204.660 293.210 C 204.595 293.332,204.673 293.432,204.834 293.432 C 205.173 293.432,205.596 292.287,205.348 292.039 C 205.255 291.947,205.090 292.123,204.980 292.430 M152.512 293.748 C 151.517 294.531,151.502 295.203,152.479 295.203 C 152.978 295.203,153.329 294.970,153.547 294.493 C 154.176 293.111,155.977 293.407,156.541 294.985 C 156.613 295.186,156.774 295.255,156.900 295.139 C 157.025 295.022,156.961 294.524,156.757 294.032 C 156.278 292.876,153.829 292.712,152.512 293.748 M195.988 293.454 C 195.693 293.641,195.843 293.719,196.507 293.722 C 197.021 293.725,197.509 293.863,197.592 294.030 C 197.674 294.196,197.712 294.175,197.675 293.984 C 197.579 293.487,196.481 293.142,195.988 293.454 M264.280 293.933 C 263.567 294.201,263.858 295.203,264.649 295.203 C 265.055 295.203,265.387 295.096,265.387 294.964 C 265.387 294.492,264.642 293.798,264.280 293.933 M199.705 294.908 C 198.727 295.083,198.905 295.123,200.738 295.140 C 202.217 295.154,202.756 295.077,202.362 294.908 C 201.683 294.616,201.334 294.616,199.705 294.908 " stroke="none" fill="#e9411e" fill-rule="evenodd"></path><path id="path3" d="M399.557 111.816 C 399.395 111.933,399.218 112.283,399.165 112.593 C 399.111 112.902,398.847 113.500,398.579 113.921 C 398.161 114.575,398.232 114.547,399.066 113.729 C 399.942 112.869,400.362 111.233,399.557 111.816 M0.886 112.447 C 0.886 112.796,1.118 113.161,1.402 113.259 C 2.406 113.605,4.298 114.541,5.756 115.413 C 6.568 115.898,7.631 116.499,8.118 116.748 C 8.605 116.997,9.668 117.590,10.480 118.066 C 11.292 118.541,12.487 119.207,13.137 119.544 C 13.786 119.881,14.982 120.540,15.793 121.007 C 16.605 121.475,17.801 122.142,18.450 122.489 C 19.100 122.836,20.030 123.349,20.517 123.628 C 21.004 123.907,22.113 124.534,22.983 125.020 C 23.852 125.506,25.180 126.263,25.935 126.703 C 26.689 127.142,27.729 127.705,28.247 127.953 C 28.764 128.202,29.675 128.736,30.271 129.141 C 30.867 129.545,32.038 130.222,32.873 130.645 C 33.708 131.068,35.055 131.791,35.867 132.252 C 37.318 133.076,38.094 133.510,40.738 134.974 C 41.469 135.379,42.774 136.129,43.638 136.642 C 44.502 137.155,45.631 137.776,46.147 138.023 C 46.663 138.269,47.616 138.798,48.266 139.198 C 48.915 139.597,50.111 140.266,50.923 140.684 C 51.734 141.103,52.797 141.671,53.284 141.949 C 53.771 142.226,55.100 142.980,56.236 143.625 C 57.373 144.270,58.701 145.026,59.188 145.306 C 59.675 145.586,60.605 146.089,61.255 146.423 C 61.904 146.758,63.048 147.392,63.797 147.833 C 64.545 148.274,68.929 150.741,73.538 153.314 C 78.148 155.888,82.279 158.246,82.719 158.554 C 83.159 158.862,83.597 159.114,83.692 159.114 C 83.944 159.114,95.176 165.397,95.351 165.636 C 95.432 165.747,95.963 166.049,96.531 166.308 C 97.100 166.567,98.229 167.175,99.041 167.660 C 99.852 168.144,101.048 168.816,101.697 169.154 C 103.472 170.076,105.396 171.148,106.716 171.950 C 107.365 172.345,108.428 172.938,109.077 173.268 C 109.727 173.598,110.923 174.263,111.734 174.747 C 112.546 175.230,113.742 175.902,114.391 176.241 C 115.041 176.580,116.236 177.238,117.048 177.705 C 117.860 178.171,118.923 178.767,119.410 179.031 C 119.897 179.294,120.959 179.895,121.771 180.367 C 122.583 180.838,123.779 181.501,124.428 181.840 C 125.077 182.179,126.273 182.852,127.085 183.337 C 127.897 183.821,128.959 184.426,129.446 184.681 C 129.934 184.935,130.996 185.528,131.808 185.997 C 132.620 186.466,133.749 187.081,134.317 187.362 C 134.886 187.643,135.550 188.027,135.793 188.215 C 136.037 188.403,137.232 189.087,138.450 189.736 C 139.668 190.385,141.480 191.397,142.476 191.984 C 143.473 192.572,144.602 193.197,144.985 193.373 C 145.369 193.550,146.298 194.050,147.050 194.486 C 148.377 195.254,153.396 198.073,155.028 198.967 C 155.473 199.210,157.593 200.406,159.740 201.624 C 161.886 202.841,164.318 204.218,165.142 204.683 C 165.967 205.149,167.173 205.841,167.823 206.222 C 168.472 206.603,169.535 207.183,170.185 207.512 C 170.834 207.841,171.565 208.240,171.808 208.397 C 172.052 208.555,173.293 209.254,174.566 209.951 C 175.840 210.648,177.368 211.511,177.961 211.869 C 178.555 212.228,179.572 212.799,180.221 213.139 C 180.871 213.479,182.066 214.139,182.878 214.605 C 184.356 215.453,185.812 216.261,187.749 217.309 C 188.317 217.617,189.446 218.260,190.258 218.739 C 191.070 219.219,192.266 219.888,192.915 220.226 C 193.565 220.565,194.760 221.225,195.572 221.692 C 196.384 222.159,197.579 222.821,198.229 223.163 C 198.878 223.505,199.773 224.083,200.218 224.447 L 201.026 225.109 201.037 259.101 C 201.043 277.797,201.029 293.203,201.005 293.336 C 200.892 293.992,201.084 294.317,201.583 294.317 C 201.978 294.317,202.114 294.129,202.064 293.653 C 202.025 293.288,201.967 292.989,201.934 292.989 C 201.574 292.989,201.474 287.176,201.338 258.450 C 201.160 220.786,201.389 224.041,198.836 222.832 C 198.177 222.520,197.107 221.952,196.458 221.571 C 193.751 219.980,192.557 219.300,191.439 218.714 C 190.790 218.373,189.594 217.711,188.782 217.241 C 187.970 216.772,186.841 216.175,186.273 215.914 C 185.705 215.653,185.041 215.269,184.797 215.060 C 184.554 214.851,183.398 214.167,182.230 213.539 C 179.617 212.136,178.925 211.752,171.536 207.601 C 168.284 205.775,165.508 204.280,165.367 204.280 C 165.226 204.280,164.870 204.015,164.576 203.690 C 164.282 203.365,163.919 203.100,163.769 203.100 C 163.549 203.100,155.981 198.916,147.659 194.195 C 146.897 193.763,145.875 193.201,145.387 192.946 C 144.900 192.692,143.838 192.092,143.026 191.615 C 142.214 191.137,141.018 190.470,140.369 190.132 C 139.720 189.794,138.524 189.134,137.712 188.664 C 136.900 188.194,135.705 187.532,135.055 187.193 C 134.406 186.854,133.210 186.179,132.399 185.694 C 131.587 185.209,130.524 184.603,130.037 184.348 C 129.550 184.094,128.487 183.503,127.675 183.036 C 126.863 182.569,125.734 181.928,125.166 181.613 C 124.598 181.297,123.469 180.668,122.657 180.214 C 121.845 179.760,120.716 179.134,120.148 178.823 C 119.579 178.511,118.450 177.875,117.638 177.409 C 116.827 176.943,115.631 176.288,114.982 175.954 C 114.332 175.620,113.269 175.033,112.620 174.650 C 111.446 173.958,109.430 172.822,107.454 171.738 C 106.886 171.426,105.756 170.794,104.945 170.332 C 104.133 169.871,103.004 169.235,102.435 168.919 C 99.778 167.442,98.357 166.641,97.269 166.003 C 96.620 165.622,95.557 165.032,94.908 164.692 C 94.258 164.351,93.112 163.721,92.360 163.291 C 91.608 162.861,89.687 161.779,88.091 160.886 C 86.495 159.993,84.786 159.034,84.292 158.756 C 83.799 158.477,82.863 157.965,82.214 157.618 C 81.565 157.271,80.411 156.636,79.650 156.206 C 75.170 153.674,69.162 150.318,68.782 150.136 C 68.539 150.020,67.726 149.568,66.977 149.132 C 66.228 148.696,64.448 147.675,63.022 146.863 C 61.596 146.052,59.818 145.032,59.071 144.598 C 58.324 144.164,57.181 143.534,56.531 143.197 C 55.882 142.861,54.819 142.274,54.170 141.894 C 52.621 140.986,50.861 140.011,47.970 138.459 C 46.672 137.762,45.410 137.037,45.166 136.849 C 44.923 136.662,44.258 136.280,43.690 136.002 C 43.122 135.723,41.993 135.101,41.181 134.618 C 40.369 134.136,39.306 133.533,38.819 133.278 C 38.332 133.024,37.269 132.435,36.458 131.970 C 35.646 131.505,34.450 130.847,33.801 130.506 C 33.151 130.166,32.089 129.560,31.439 129.160 C 30.790 128.759,29.727 128.150,29.077 127.805 C 27.556 126.997,25.854 126.043,21.865 123.764 C 20.088 122.749,18.520 121.919,18.380 121.919 C 18.240 121.919,17.961 121.754,17.759 121.552 C 17.443 121.237,15.738 120.267,11.218 117.831 C 9.481 116.896,7.627 115.853,5.432 114.577 C 4.279 113.906,3.241 113.358,3.124 113.358 C 3.008 113.358,2.457 113.010,1.899 112.585 C 0.905 111.827,0.886 111.824,0.886 112.447 M328.561 221.993 C 328.939 222.237,328.929 222.279,328.487 222.283 C 328.203 222.286,327.970 222.487,327.970 222.731 C 327.970 223.258,328.475 223.195,329.143 222.583 C 329.655 222.114,329.384 221.706,328.561 221.706 C 328.167 221.706,328.167 221.738,328.561 221.993 M318.580 227.535 C 318.375 227.815,318.299 227.858,318.411 227.630 C 318.545 227.357,318.497 227.288,318.270 227.429 C 318.079 227.546,317.993 227.754,318.077 227.890 C 318.295 228.243,317.921 229.104,317.628 228.923 C 317.494 228.840,317.314 228.886,317.229 229.023 C 317.052 229.310,318.003 229.381,318.229 229.098 C 318.310 228.997,318.667 228.784,319.022 228.627 C 319.585 228.376,319.622 228.256,319.311 227.683 C 318.980 227.073,318.927 227.063,318.580 227.535 M315.953 228.832 C 316.053 229.117,315.947 229.392,315.701 229.487 C 315.468 229.576,315.287 229.886,315.300 230.175 C 315.318 230.591,315.360 230.608,315.496 230.258 C 315.590 230.015,315.879 229.658,316.136 229.466 C 316.537 229.168,316.545 229.061,316.193 228.728 C 315.848 228.403,315.808 228.420,315.953 228.832 M305.409 235.053 C 305.281 235.499,305.080 235.803,304.962 235.731 C 304.844 235.658,304.748 235.791,304.748 236.028 C 304.748 236.264,304.925 236.458,305.141 236.458 C 305.358 236.458,305.535 236.325,305.535 236.162 C 305.535 236.000,305.734 235.867,305.978 235.867 C 306.221 235.867,306.421 235.726,306.421 235.555 C 306.421 235.383,306.297 235.318,306.147 235.411 C 305.996 235.504,305.821 235.280,305.757 234.912 C 305.648 234.279,305.629 234.287,305.409 235.053 M303.062 235.795 C 303.112 235.878,303.024 236.185,302.867 236.478 C 302.667 236.852,302.692 237.076,302.951 237.225 C 303.155 237.342,303.223 237.329,303.102 237.196 C 302.982 237.063,303.036 236.771,303.223 236.546 C 303.447 236.276,303.461 236.054,303.266 235.892 C 303.104 235.756,303.011 235.713,303.062 235.795 M96.304 237.196 C 96.337 237.601,96.543 237.934,96.761 237.934 C 96.978 237.934,97.075 237.801,96.974 237.638 C 96.874 237.476,96.932 237.343,97.104 237.343 C 97.276 237.343,97.417 237.144,97.417 236.900 C 97.417 236.655,97.155 236.458,96.830 236.458 C 96.384 236.458,96.257 236.635,96.304 237.196 M295.880 240.587 C 295.795 240.910,295.608 241.101,295.465 241.012 C 295.321 240.924,295.203 240.991,295.203 241.163 C 295.203 241.335,295.336 241.476,295.498 241.476 C 295.661 241.476,295.886 241.479,295.999 241.484 C 296.112 241.488,296.249 241.156,296.304 240.746 C 296.422 239.863,296.101 239.743,295.880 240.587 M292.841 241.771 C 292.435 242.089,292.228 242.351,292.381 242.355 C 292.534 242.359,292.433 242.528,292.156 242.731 C 291.710 243.058,291.753 243.107,292.533 243.161 C 293.017 243.194,293.504 243.074,293.615 242.894 C 293.738 242.695,293.684 242.649,293.477 242.776 C 293.290 242.892,293.137 242.846,293.137 242.674 C 293.137 242.502,293.369 242.351,293.653 242.338 C 293.937 242.326,294.011 242.250,293.817 242.172 C 293.623 242.093,293.538 241.838,293.628 241.605 C 293.839 241.053,293.730 241.076,292.841 241.771 M109.520 243.821 C 109.520 243.974,109.255 244.048,108.930 243.985 C 108.232 243.851,108.185 244.021,108.761 244.597 C 109.377 245.212,109.679 245.115,109.748 244.280 C 109.781 243.875,109.744 243.542,109.665 243.542 C 109.585 243.542,109.520 243.668,109.520 243.821 M285.756 246.758 C 285.756 247.102,286.619 247.429,286.964 247.216 C 287.112 247.125,287.230 246.892,287.228 246.698 C 287.225 246.463,287.139 246.479,286.970 246.747 C 286.793 247.027,286.655 247.049,286.514 246.821 C 286.272 246.430,285.756 246.387,285.756 246.758 M283.540 247.377 C 283.644 247.544,283.525 247.594,283.263 247.493 C 283.011 247.396,282.804 247.464,282.804 247.644 C 282.804 247.823,282.605 247.970,282.362 247.970 C 282.118 247.970,281.919 248.103,281.919 248.266 C 281.919 248.428,282.042 248.561,282.193 248.561 C 282.344 248.561,282.700 248.793,282.984 249.077 C 283.477 249.570,283.493 249.561,283.321 248.901 C 283.221 248.519,283.218 248.286,283.314 248.382 C 283.410 248.477,283.658 248.414,283.867 248.242 C 284.271 247.906,284.110 247.085,283.641 247.085 C 283.486 247.085,283.441 247.216,283.540 247.377 M284.871 247.338 C 284.871 247.642,285.765 248.060,285.972 247.854 C 286.043 247.782,285.825 247.575,285.487 247.394 C 285.148 247.212,284.871 247.187,284.871 247.338 M270.111 254.628 C 270.111 254.825,269.818 255.063,269.459 255.157 C 268.746 255.343,268.867 255.645,269.704 255.768 C 270.263 255.850,271.017 255.339,270.819 255.012 C 270.666 254.758,271.573 254.422,271.888 254.616 C 272.025 254.701,272.202 254.663,272.283 254.533 C 272.363 254.402,271.908 254.290,271.270 254.282 C 270.550 254.274,270.111 254.405,270.111 254.628 M267.360 256.054 C 267.264 256.306,267.302 256.585,267.446 256.674 C 267.823 256.907,268.047 256.424,267.771 255.976 C 267.587 255.679,267.498 255.697,267.360 256.054 M131.661 256.549 C 131.661 256.721,131.529 256.780,131.369 256.681 C 131.201 256.577,131.152 256.697,131.255 256.964 C 131.444 257.458,132.255 257.464,132.615 256.974 C 132.984 256.473,132.867 256.236,132.251 256.236 C 131.926 256.236,131.661 256.377,131.661 256.549 M261.845 260.369 C 261.845 260.531,261.745 260.636,261.624 260.602 C 261.502 260.568,261.004 260.770,260.517 261.049 C 259.883 261.414,259.799 261.536,260.221 261.480 C 260.546 261.437,260.907 261.269,261.022 261.107 C 261.138 260.945,261.338 260.808,261.465 260.804 C 262.035 260.785,262.897 260.092,262.362 260.083 C 262.077 260.078,261.845 260.207,261.845 260.369 M258.152 261.850 C 258.050 262.015,257.858 262.083,257.725 262.001 C 257.592 261.919,257.321 262.048,257.122 262.288 C 256.923 262.528,256.621 262.639,256.452 262.534 C 256.266 262.419,256.234 262.489,256.371 262.711 C 256.535 262.975,256.688 262.987,256.919 262.756 C 257.345 262.330,257.803 262.345,257.536 262.776 C 257.406 262.987,257.455 263.037,257.665 262.907 C 258.032 262.681,258.709 261.550,258.478 261.550 C 258.401 261.550,258.254 261.685,258.152 261.850 M248.005 266.839 C 247.986 267.069,247.893 267.179,247.798 267.085 C 247.557 266.843,246.494 267.799,246.494 268.257 C 246.494 268.465,246.635 268.635,246.807 268.635 C 246.979 268.635,247.036 268.469,246.933 268.266 C 246.830 268.063,246.922 268.096,247.138 268.339 C 247.639 268.905,248.288 269.042,248.192 268.561 C 248.151 268.358,248.294 268.228,248.509 268.273 C 248.724 268.318,248.822 268.228,248.727 268.074 C 248.632 267.920,248.788 267.733,249.074 267.658 C 249.483 267.551,249.456 267.515,248.952 267.488 C 248.598 267.469,248.248 267.221,248.174 266.937 C 248.090 266.615,248.026 266.578,248.005 266.839 M244.466 269.139 C 244.170 269.456,244.151 269.656,244.394 269.899 C 244.636 270.142,244.723 270.127,244.723 269.843 C 244.723 269.631,244.900 269.525,245.117 269.608 C 245.333 269.691,245.510 269.578,245.510 269.357 C 245.510 268.766,244.928 268.644,244.466 269.139 M238.558 273.316 C 238.536 273.571,238.336 273.645,238.007 273.521 C 237.518 273.336,237.518 273.353,238.000 273.841 C 238.584 274.431,238.936 274.245,238.732 273.455 C 238.655 273.158,238.577 273.095,238.558 273.316 M234.613 274.271 C 233.793 274.743,233.945 275.725,234.827 275.652 C 235.692 275.581,235.964 275.072,235.478 274.432 C 235.220 274.093,234.995 274.051,234.613 274.271 M167.085 276.320 C 166.697 276.579,166.706 276.665,167.154 277.009 C 167.436 277.225,167.608 277.460,167.537 277.531 C 167.466 277.601,167.767 277.687,168.206 277.720 C 168.819 277.766,168.901 277.713,168.561 277.492 C 168.317 277.334,168.222 277.203,168.350 277.200 C 168.477 277.198,168.439 276.930,168.266 276.605 C 167.910 275.941,167.720 275.895,167.085 276.320 M224.502 280.233 C 224.029 280.806,223.965 281.704,224.408 281.556 C 224.622 281.484,224.799 281.214,224.801 280.955 C 224.803 280.696,224.924 280.375,225.070 280.242 C 225.215 280.109,225.263 280.133,225.177 280.295 C 225.090 280.458,225.121 280.856,225.247 281.181 C 225.427 281.646,225.472 281.568,225.460 280.812 C 225.445 279.835,225.034 279.587,224.502 280.233 M222.158 281.595 C 222.057 281.759,221.766 281.813,221.511 281.716 C 221.108 281.561,221.099 281.619,221.444 282.171 C 221.860 282.837,222.288 283.009,222.288 282.509 C 222.288 282.347,222.454 282.247,222.657 282.288 C 223.122 282.381,223.147 281.566,222.684 281.411 C 222.496 281.349,222.259 281.431,222.158 281.595 M180.074 284.003 C 180.074 284.337,180.197 284.534,180.349 284.441 C 180.500 284.347,180.707 284.406,180.809 284.571 C 180.911 284.736,181.152 284.867,181.346 284.862 C 181.539 284.857,181.465 284.717,181.181 284.552 C 180.897 284.387,180.664 284.058,180.664 283.823 C 180.664 283.587,180.531 283.395,180.369 283.395 C 180.207 283.395,180.074 283.668,180.074 284.003 M214.701 287.264 C 215.016 287.769,215.123 287.731,215.299 287.047 C 215.327 286.936,215.125 286.813,214.849 286.772 C 214.426 286.710,214.403 286.787,214.701 287.264 M211.644 287.400 C 211.369 287.732,211.380 287.827,211.698 287.844 C 211.921 287.855,211.838 287.968,211.513 288.095 C 210.952 288.314,210.958 288.337,211.638 288.553 C 212.355 288.781,213.137 288.173,213.137 287.386 C 213.137 286.904,212.048 286.914,211.644 287.400 M208.974 289.190 C 208.598 289.646,208.619 289.660,209.201 289.350 C 209.625 289.124,209.892 289.110,209.991 289.309 C 210.073 289.474,210.109 289.448,210.070 289.251 C 209.958 288.677,209.422 288.647,208.974 289.190 M202.674 292.718 C 203.140 293.097,203.153 293.155,202.746 293.028 C 202.346 292.903,202.289 292.992,202.465 293.469 C 202.734 294.196,203.183 294.226,203.286 293.524 C 203.371 292.946,202.896 292.251,202.417 292.251 C 202.243 292.251,202.359 292.461,202.674 292.718 " stroke="none" fill="#dc3e22" fill-rule="evenodd"></path><path id="path4" d="M198.108 0.410 C 197.769 0.819,197.792 0.885,198.266 0.881 C 199.001 0.875,199.746 0.386,199.459 0.098 C 199.333 -0.027,199.120 0.047,198.986 0.263 C 198.802 0.561,198.714 0.569,198.623 0.296 C 198.537 0.039,198.389 0.072,198.108 0.410 M201.624 0.303 C 201.624 0.560,202.770 1.019,202.953 0.836 C 203.010 0.779,202.734 0.580,202.340 0.394 C 201.946 0.208,201.624 0.167,201.624 0.303 M203.447 1.378 C 203.579 2.061,204.168 2.195,204.398 1.594 C 204.566 1.159,204.527 1.148,204.084 1.508 C 203.640 1.870,203.603 1.857,203.773 1.402 C 203.880 1.117,203.829 0.886,203.659 0.886 C 203.490 0.886,203.394 1.107,203.447 1.378 M191.292 4.159 C 190.801 4.560,190.752 4.660,191.144 4.458 C 192.107 3.960,192.641 3.551,192.325 3.554 C 192.162 3.555,191.697 3.827,191.292 4.159 M183.469 8.266 C 183.368 8.428,183.568 8.561,183.911 8.561 C 184.255 8.561,184.455 8.428,184.354 8.266 C 184.254 8.103,184.055 7.970,183.911 7.970 C 183.768 7.970,183.569 8.103,183.469 8.266 M216.384 8.266 C 216.384 8.428,216.517 8.561,216.679 8.561 C 216.841 8.561,216.974 8.731,216.974 8.939 C 216.974 9.147,217.339 9.339,217.786 9.365 C 218.559 9.410,218.566 9.399,217.927 9.141 C 217.558 8.992,217.179 8.668,217.084 8.420 C 216.891 7.919,216.384 7.806,216.384 8.266 M171.218 15.313 C 171.218 15.474,170.952 15.690,170.627 15.793 C 169.873 16.033,169.858 16.508,170.607 16.452 C 170.920 16.428,171.117 16.312,171.043 16.193 C 170.970 16.074,171.129 15.855,171.397 15.705 C 171.729 15.519,171.778 15.367,171.551 15.226 C 171.368 15.113,171.218 15.152,171.218 15.313 M166.248 17.971 C 165.933 18.171,165.951 18.257,166.337 18.406 C 166.603 18.508,166.745 18.470,166.654 18.322 C 166.562 18.173,166.721 17.991,167.007 17.916 C 167.372 17.821,167.395 17.772,167.085 17.751 C 166.841 17.735,166.465 17.834,166.248 17.971 M163.410 19.656 C 162.918 20.016,162.896 20.129,163.258 20.444 C 163.490 20.646,163.585 20.692,163.468 20.546 C 163.352 20.399,163.487 20.111,163.768 19.906 C 164.049 19.700,164.213 19.465,164.132 19.384 C 164.051 19.303,163.726 19.425,163.410 19.656 M241.668 22.889 C 241.752 23.106,242.014 23.209,242.251 23.118 C 242.730 22.935,242.567 22.648,241.931 22.554 C 241.694 22.520,241.582 22.663,241.668 22.889 M147.993 28.492 C 147.154 29.450,147.587 29.446,148.487 28.487 C 148.868 28.081,149.058 27.751,148.908 27.754 C 148.757 27.757,148.346 28.089,147.993 28.492 M251.513 27.914 C 251.513 28.380,252.168 29.220,252.413 29.068 C 252.843 28.803,252.751 28.517,252.103 28.113 C 251.779 27.910,251.513 27.820,251.513 27.914 M254.632 30.141 C 254.725 30.292,254.925 30.339,255.076 30.246 C 255.227 30.152,255.351 30.202,255.351 30.357 C 255.351 30.804,256.196 31.007,256.422 30.614 C 256.534 30.419,256.517 30.357,256.384 30.477 C 256.252 30.598,255.951 30.537,255.717 30.342 C 255.196 29.911,254.397 29.763,254.632 30.141 M267.371 37.025 C 267.947 37.796,268.157 37.832,267.881 37.113 C 267.783 36.859,267.510 36.577,267.274 36.486 C 266.950 36.362,266.974 36.495,267.371 37.025 M128.036 39.384 C 127.628 39.693,127.600 39.817,127.909 39.936 C 128.129 40.020,128.466 39.836,128.658 39.528 C 129.065 38.877,128.788 38.813,128.036 39.384 M122.964 42.317 C 122.517 42.643,122.494 42.757,122.834 42.954 C 123.062 43.087,123.144 43.081,123.017 42.941 C 122.890 42.802,123.089 42.519,123.459 42.314 C 123.830 42.108,123.992 41.935,123.820 41.929 C 123.648 41.924,123.263 42.098,122.964 42.317 M111.439 49.004 C 110.622 49.212,110.611 49.231,111.292 49.259 C 111.697 49.276,112.229 49.161,112.472 49.004 C 112.975 48.679,112.715 48.679,111.439 49.004 M290.008 49.806 C 290.770 50.648,291.662 50.903,291.193 50.144 C 291.093 49.983,290.935 49.926,290.841 50.020 C 290.748 50.113,290.329 49.890,289.911 49.524 C 289.277 48.968,289.293 49.015,290.008 49.806 M102.566 53.850 C 102.251 54.081,102.072 54.347,102.167 54.443 C 102.263 54.538,102.582 54.350,102.877 54.024 C 103.504 53.331,103.375 53.259,102.566 53.850 M99.188 55.744 C 99.188 55.934,98.889 56.104,98.524 56.123 C 97.977 56.151,97.957 56.182,98.408 56.298 C 98.997 56.450,99.723 55.934,99.390 55.601 C 99.279 55.491,99.188 55.555,99.188 55.744 M302.703 56.905 C 303.012 57.268,303.410 57.554,303.588 57.541 C 303.773 57.528,303.753 57.454,303.541 57.368 C 303.337 57.286,303.258 57.064,303.367 56.875 C 303.475 56.686,303.455 56.630,303.322 56.750 C 303.189 56.871,302.869 56.806,302.610 56.608 C 302.322 56.386,302.358 56.502,302.703 56.905 M94.892 57.886 C 94.783 58.062,94.849 58.361,95.040 58.550 C 95.303 58.811,95.341 58.776,95.199 58.402 C 95.074 58.075,95.191 57.865,95.550 57.772 C 96.012 57.653,96.017 57.628,95.589 57.599 C 95.315 57.580,95.001 57.709,94.892 57.886 M307.141 59.172 C 307.823 59.718,308.192 59.759,308.192 59.287 C 308.192 59.097,308.108 59.026,308.005 59.129 C 307.903 59.231,307.538 59.180,307.194 59.014 C 306.586 58.721,306.584 58.726,307.141 59.172 M311.464 61.803 C 311.531 61.862,311.985 61.999,312.472 62.108 C 313.119 62.252,313.239 62.225,312.915 62.006 C 312.516 61.736,311.167 61.548,311.464 61.803 M79.483 66.838 C 78.862 67.434,78.856 67.475,79.388 67.475 C 79.701 67.475,79.897 67.379,79.825 67.261 C 79.752 67.144,79.911 66.925,80.179 66.775 C 80.447 66.625,80.550 66.435,80.407 66.352 C 80.264 66.269,79.849 66.488,79.483 66.838 M59.434 77.718 C 59.256 78.007,60.697 77.852,60.998 77.550 C 61.113 77.435,60.842 77.372,60.395 77.409 C 59.949 77.446,59.516 77.585,59.434 77.718 M339.631 77.554 C 339.956 77.633,340.554 77.983,340.959 78.332 L 341.697 78.967 340.982 78.155 C 340.588 77.708,339.990 77.359,339.653 77.377 C 339.060 77.411,339.059 77.416,339.631 77.554 M56.974 79.132 C 56.974 79.304,56.843 79.363,56.682 79.264 C 56.514 79.160,56.466 79.281,56.569 79.549 C 56.696 79.879,56.854 79.927,57.110 79.715 C 57.309 79.550,57.566 79.509,57.681 79.625 C 57.797 79.740,57.803 79.606,57.696 79.327 C 57.483 78.770,56.974 78.633,56.974 79.132 M43.741 86.818 C 43.178 87.719,43.482 87.792,44.227 86.935 C 44.615 86.489,44.721 86.199,44.497 86.199 C 44.294 86.199,43.953 86.478,43.741 86.818 M358.104 87.749 C 358.089 88.081,358.298 88.266,358.689 88.266 C 359.026 88.266,359.214 88.132,359.111 87.966 C 359.009 87.801,358.814 87.735,358.676 87.820 C 358.539 87.905,358.360 87.807,358.277 87.603 C 358.187 87.380,358.119 87.437,358.104 87.749 M360.590 89.152 C 360.421 89.425,360.466 89.467,360.743 89.296 C 361.036 89.115,361.080 89.194,360.920 89.610 C 360.803 89.916,360.798 90.076,360.909 89.964 C 361.020 89.853,361.392 89.907,361.736 90.083 C 362.272 90.358,362.300 90.346,361.932 89.999 C 361.696 89.776,361.351 89.408,361.166 89.180 C 360.891 88.844,360.784 88.839,360.590 89.152 M380.933 100.597 C 381.243 100.961,381.563 101.192,381.644 101.111 C 381.725 101.031,382.002 101.127,382.261 101.326 C 382.546 101.546,382.510 101.428,382.167 101.026 C 381.856 100.663,381.537 100.431,381.456 100.512 C 381.375 100.593,381.097 100.496,380.839 100.298 C 380.553 100.078,380.590 100.195,380.933 100.597 M16.531 101.929 C 16.047 102.324,15.810 103.027,16.162 103.024 C 16.284 103.022,16.537 102.690,16.725 102.286 C 16.913 101.881,17.046 101.554,17.020 101.559 C 16.995 101.564,16.775 101.731,16.531 101.929 M384.453 102.531 C 384.453 103.122,385.152 103.415,385.425 102.939 C 385.538 102.743,385.522 102.681,385.390 102.800 C 385.258 102.919,384.994 102.802,384.802 102.539 C 384.486 102.108,384.453 102.107,384.453 102.531 M14.886 102.872 C 14.573 103.109,14.450 103.304,14.613 103.307 C 15.051 103.314,15.801 102.787,15.616 102.602 C 15.527 102.514,15.199 102.635,14.886 102.872 M394.096 108.138 C 394.096 108.689,394.577 109.050,394.810 108.673 C 394.901 108.526,394.777 108.242,394.535 108.042 C 394.178 107.745,394.096 107.763,394.096 108.138 M397.837 112.112 C 397.396 112.554,396.055 113.446,394.857 114.096 C 392.691 115.270,372.801 126.424,371.956 126.938 C 371.484 127.225,365.089 130.765,363.012 131.889 C 362.329 132.258,361.240 132.884,360.590 133.279 C 359.941 133.674,358.878 134.269,358.229 134.602 C 357.579 134.935,356.517 135.517,355.867 135.896 C 354.774 136.533,353.287 137.371,350.701 138.808 C 350.133 139.124,349.004 139.760,348.192 140.221 C 345.255 141.891,342.482 143.417,339.631 144.933 C 338.332 145.623,337.070 146.360,336.827 146.570 C 336.583 146.780,335.919 147.171,335.351 147.438 C 334.782 147.705,333.653 148.305,332.841 148.772 C 330.720 149.993,329.444 150.698,328.266 151.300 C 327.697 151.590,326.900 152.054,326.494 152.330 C 325.522 152.993,305.035 164.428,304.821 164.428 C 304.730 164.428,303.723 165.026,302.583 165.756 C 301.443 166.487,300.437 167.085,300.347 167.085 C 300.258 167.085,298.723 167.915,296.936 168.930 C 291.687 171.912,290.984 172.306,289.742 172.959 C 289.092 173.301,288.030 173.898,287.380 174.286 C 286.731 174.674,285.203 175.522,283.985 176.171 C 282.768 176.819,280.974 177.827,280.000 178.410 C 279.026 178.993,277.697 179.740,277.048 180.071 C 276.399 180.402,275.336 180.988,274.686 181.374 C 274.037 181.760,272.443 182.634,271.144 183.317 C 269.845 184.000,268.583 184.717,268.339 184.911 C 268.096 185.105,267.432 185.497,266.863 185.783 C 266.295 186.069,265.299 186.626,264.649 187.022 C 264.000 187.417,262.937 188.013,262.288 188.345 C 261.638 188.678,260.443 189.346,259.631 189.829 C 258.819 190.312,257.624 190.978,256.974 191.307 C 256.325 191.637,255.262 192.233,254.613 192.632 C 253.963 193.030,252.900 193.636,252.251 193.978 C 251.601 194.320,250.406 194.979,249.594 195.442 C 248.782 195.906,247.653 196.539,247.085 196.848 C 245.473 197.727,243.214 198.995,241.919 199.748 C 241.269 200.126,240.273 200.664,239.705 200.944 C 239.137 201.224,238.472 201.606,238.229 201.794 C 237.985 201.982,236.790 202.668,235.572 203.319 C 233.376 204.492,226.681 208.202,225.830 208.716 C 225.110 209.152,220.024 212.010,217.700 213.284 C 216.516 213.934,215.441 214.571,215.311 214.701 C 215.182 214.830,214.540 215.196,213.885 215.514 C 213.230 215.831,212.030 216.477,211.218 216.950 C 210.406 217.422,209.343 218.017,208.856 218.271 C 208.369 218.526,207.306 219.127,206.494 219.608 C 205.683 220.088,204.579 220.685,204.042 220.934 C 203.505 221.183,202.723 221.656,202.305 221.985 C 201.315 222.763,199.961 222.742,198.672 221.930 C 198.103 221.572,197.173 221.036,196.605 220.740 C 196.037 220.443,195.041 219.874,194.391 219.475 C 193.742 219.076,192.745 218.536,192.177 218.275 C 191.609 218.014,190.945 217.628,190.701 217.416 C 190.458 217.204,189.196 216.476,187.897 215.798 C 186.598 215.120,185.004 214.244,184.354 213.852 C 183.705 213.459,182.642 212.860,181.993 212.519 C 181.343 212.179,180.148 211.525,179.336 211.066 C 177.729 210.157,176.233 209.331,174.170 208.213 C 173.439 207.817,172.310 207.172,171.661 206.780 C 170.321 205.970,168.378 204.889,166.642 203.988 C 165.993 203.650,164.797 202.978,163.985 202.494 C 163.173 202.009,162.111 201.404,161.624 201.150 C 161.137 200.895,160.074 200.303,159.262 199.833 C 158.450 199.364,157.321 198.750,156.753 198.468 C 156.185 198.187,155.516 197.791,155.266 197.588 C 155.017 197.385,153.822 196.699,152.610 196.063 C 151.398 195.428,149.808 194.558,149.077 194.131 C 148.347 193.705,147.202 193.092,146.533 192.770 C 145.865 192.448,145.162 191.996,144.972 191.767 C 144.781 191.537,144.265 191.260,143.826 191.150 C 143.386 191.040,142.827 190.779,142.583 190.570 C 142.339 190.360,141.144 189.658,139.926 189.009 C 138.708 188.360,136.897 187.349,135.900 186.761 C 134.904 186.174,133.775 185.553,133.391 185.382 C 133.008 185.211,131.963 184.620,131.070 184.069 C 130.177 183.517,128.915 182.792,128.266 182.457 C 127.616 182.122,126.487 181.498,125.756 181.071 C 125.026 180.645,123.436 179.775,122.224 179.140 C 121.012 178.504,119.817 177.818,119.568 177.615 C 119.318 177.412,118.649 177.017,118.081 176.737 C 117.096 176.252,115.817 175.533,113.210 174.001 C 112.561 173.620,111.498 173.034,110.849 172.701 C 110.199 172.367,109.004 171.706,108.192 171.231 C 107.380 170.757,106.185 170.095,105.535 169.760 C 104.886 169.426,103.690 168.757,102.878 168.273 C 102.066 167.790,101.004 167.185,100.517 166.929 C 100.030 166.672,98.967 166.073,98.155 165.598 C 97.343 165.122,96.148 164.460,95.498 164.127 C 94.849 163.794,93.653 163.130,92.841 162.651 C 92.030 162.172,90.967 161.572,90.480 161.317 C 89.993 161.062,88.930 160.463,88.118 159.985 C 87.306 159.508,86.111 158.838,85.461 158.498 C 84.812 158.157,83.616 157.503,82.804 157.043 C 81.993 156.584,80.930 156.001,80.443 155.748 C 79.956 155.495,78.893 154.890,78.081 154.403 C 77.269 153.917,76.074 153.237,75.424 152.892 C 74.775 152.546,73.579 151.885,72.768 151.421 C 71.956 150.957,70.827 150.322,70.258 150.010 C 69.690 149.697,68.760 149.186,68.192 148.874 C 67.093 148.270,64.208 146.583,63.469 146.112 C 63.225 145.957,62.694 145.688,62.288 145.514 C 61.882 145.341,60.932 144.843,60.178 144.407 C 59.423 143.972,57.940 143.118,56.883 142.509 C 55.825 141.900,54.836 141.402,54.684 141.402 C 54.533 141.402,54.168 141.137,53.875 140.812 C 53.581 140.487,53.219 140.221,53.070 140.221 C 52.921 140.221,50.741 139.059,48.225 137.638 C 45.710 136.218,43.295 134.882,42.859 134.671 C 42.423 134.460,41.867 134.162,41.624 134.009 C 41.380 133.857,40.583 133.394,39.852 132.981 C 39.122 132.567,37.860 131.847,37.048 131.380 C 36.236 130.913,35.173 130.323,34.686 130.068 C 34.199 129.813,33.137 129.217,32.325 128.744 C 31.513 128.270,29.786 127.325,28.487 126.644 C 27.188 125.962,25.926 125.246,25.683 125.053 C 25.439 124.859,24.775 124.470,24.207 124.189 C 23.638 123.908,22.642 123.354,21.993 122.958 C 21.343 122.563,20.280 121.961,19.631 121.621 C 18.982 121.281,17.786 120.618,16.974 120.148 C 16.162 119.677,14.967 119.018,14.317 118.682 C 13.668 118.347,12.472 117.687,11.661 117.217 C 10.849 116.746,9.786 116.145,9.299 115.880 C 8.812 115.615,7.749 115.011,6.937 114.539 C 6.125 114.066,4.996 113.460,4.428 113.193 C 3.860 112.925,3.157 112.454,2.867 112.146 C 2.576 111.839,2.115 111.587,1.842 111.587 C 1.481 111.587,1.610 111.829,2.314 112.472 C 2.847 112.959,3.457 113.358,3.668 113.358 C 3.880 113.358,4.370 113.606,4.757 113.908 C 5.144 114.211,6.417 114.975,7.586 115.606 C 8.754 116.237,10.348 117.115,11.128 117.558 C 11.908 118.001,13.011 118.593,13.579 118.875 C 14.148 119.156,14.812 119.543,15.055 119.735 C 15.299 119.928,16.494 120.618,17.712 121.269 C 18.930 121.921,21.950 123.596,24.424 124.991 C 26.898 126.386,29.003 127.528,29.102 127.528 C 29.201 127.528,29.676 127.809,30.158 128.152 C 30.640 128.495,31.923 129.243,33.008 129.814 C 34.094 130.384,35.114 130.955,35.277 131.083 C 35.439 131.210,36.635 131.873,37.934 132.557 C 39.232 133.240,40.442 133.917,40.622 134.060 C 40.802 134.203,41.865 134.801,42.984 135.389 C 44.103 135.976,45.218 136.612,45.461 136.801 C 45.705 136.990,46.369 137.372,46.937 137.648 C 47.506 137.925,48.170 138.279,48.413 138.436 C 48.657 138.592,49.899 139.291,51.174 139.987 C 52.449 140.684,53.977 141.532,54.569 141.870 C 55.161 142.209,56.708 143.058,58.007 143.756 C 59.306 144.454,60.502 145.129,60.664 145.255 C 60.827 145.381,61.889 145.974,63.026 146.573 C 64.162 147.172,65.292 147.835,65.535 148.045 C 65.779 148.256,66.443 148.647,67.011 148.914 C 67.579 149.181,68.708 149.785,69.520 150.256 C 70.332 150.728,71.528 151.391,72.177 151.731 C 72.827 152.070,73.889 152.660,74.539 153.042 C 77.145 154.574,78.424 155.292,79.410 155.778 C 79.978 156.058,80.642 156.440,80.886 156.628 C 81.129 156.816,82.391 157.540,83.690 158.237 C 86.581 159.790,88.340 160.764,89.889 161.672 C 90.539 162.053,91.601 162.642,92.251 162.981 C 92.900 163.320,94.096 163.978,94.908 164.442 C 95.720 164.907,96.782 165.496,97.269 165.751 C 97.756 166.005,98.771 166.576,99.524 167.018 C 100.276 167.461,101.937 168.393,103.214 169.090 C 104.490 169.787,105.734 170.477,105.978 170.622 C 106.221 170.768,109.277 172.498,112.768 174.465 C 116.258 176.432,119.314 178.160,119.557 178.305 C 120.527 178.880,131.947 185.230,134.022 186.347 C 135.240 187.003,136.568 187.760,136.974 188.028 C 137.380 188.296,138.044 188.678,138.450 188.877 C 138.856 189.075,139.852 189.620,140.664 190.087 C 141.476 190.554,142.672 191.213,143.321 191.552 C 143.970 191.892,145.166 192.566,145.978 193.051 C 146.790 193.537,147.852 194.142,148.339 194.397 C 148.827 194.652,149.889 195.246,150.701 195.717 C 151.513 196.189,152.708 196.847,153.358 197.180 C 154.007 197.513,155.203 198.180,156.015 198.664 C 156.827 199.147,157.889 199.743,158.376 199.987 C 158.863 200.232,159.926 200.829,160.738 201.315 C 161.550 201.801,162.679 202.414,163.247 202.678 C 163.815 202.942,164.480 203.329,164.723 203.538 C 164.967 203.747,166.122 204.431,167.290 205.058 C 168.459 205.686,170.053 206.564,170.833 207.010 C 171.613 207.456,172.782 208.099,173.432 208.440 C 174.081 208.780,175.277 209.439,176.089 209.904 C 176.900 210.368,177.963 210.957,178.450 211.212 C 178.937 211.467,180.000 212.072,180.812 212.556 C 181.624 213.041,182.753 213.648,183.321 213.907 C 183.889 214.165,184.554 214.545,184.797 214.750 C 185.041 214.956,186.236 215.657,187.454 216.308 C 189.849 217.588,193.824 219.783,194.539 220.220 C 200.656 223.959,200.397 223.981,208.708 219.040 C 208.952 218.895,211.252 217.607,213.820 216.178 C 216.388 214.749,219.111 213.226,219.872 212.795 C 220.632 212.363,221.938 211.663,222.773 211.238 C 223.608 210.814,224.779 210.136,225.375 209.731 C 225.971 209.327,226.882 208.797,227.399 208.555 C 227.916 208.312,229.004 207.724,229.815 207.248 C 230.627 206.772,231.823 206.107,232.472 205.770 C 233.122 205.433,234.317 204.768,235.129 204.292 C 235.941 203.816,237.004 203.218,237.491 202.963 C 237.978 202.709,239.041 202.108,239.852 201.629 C 240.664 201.150,241.860 200.481,242.509 200.143 C 243.159 199.804,244.354 199.141,245.166 198.669 C 245.978 198.198,247.041 197.604,247.528 197.349 C 248.015 197.094,249.077 196.491,249.889 196.009 C 250.701 195.527,251.830 194.904,252.399 194.626 C 252.967 194.347,253.631 193.966,253.875 193.778 C 254.118 193.590,255.380 192.866,256.679 192.168 C 257.978 191.470,259.572 190.589,260.221 190.209 C 260.871 189.829,261.934 189.243,262.583 188.908 C 263.232 188.573,264.494 187.847,265.387 187.295 C 266.280 186.743,267.210 186.201,267.454 186.090 C 267.874 185.898,275.364 181.715,278.322 180.019 C 279.083 179.584,279.904 179.132,280.148 179.015 C 280.517 178.838,286.647 175.417,290.722 173.113 C 291.319 172.775,292.672 172.031,293.727 171.459 C 295.475 170.512,297.205 169.539,301.062 167.332 C 301.817 166.900,302.900 166.290,303.469 165.977 C 304.037 165.664,305.166 165.037,305.978 164.583 C 306.790 164.129,307.919 163.502,308.487 163.189 C 309.055 162.877,310.185 162.232,310.996 161.757 C 312.391 160.942,312.939 160.641,316.162 158.927 C 316.893 158.539,318.155 157.827,318.967 157.346 C 319.779 156.866,320.841 156.266,321.328 156.014 C 321.815 155.762,322.878 155.163,323.690 154.683 C 324.502 154.202,325.631 153.560,326.199 153.254 C 328.808 151.853,330.208 151.069,330.480 150.858 C 330.642 150.731,331.705 150.124,332.841 149.508 C 335.563 148.033,336.300 147.623,342.731 143.997 C 345.734 142.303,348.590 140.711,349.077 140.460 C 349.565 140.208,352.354 138.643,355.277 136.981 C 358.199 135.320,361.532 133.449,362.682 132.824 C 363.832 132.199,366.090 130.932,367.700 130.008 C 369.310 129.085,371.092 128.072,371.661 127.758 C 372.229 127.443,373.358 126.805,374.170 126.339 C 374.982 125.873,376.177 125.215,376.827 124.876 C 377.476 124.537,378.672 123.868,379.483 123.389 C 380.295 122.910,381.358 122.311,381.845 122.058 C 382.332 121.805,383.395 121.212,384.207 120.740 C 385.018 120.269,386.214 119.604,386.863 119.262 C 387.513 118.920,388.708 118.255,389.520 117.784 C 390.332 117.312,391.395 116.719,391.882 116.466 C 392.369 116.213,393.432 115.612,394.244 115.132 C 395.055 114.651,396.291 113.979,396.989 113.639 C 397.748 113.270,398.375 112.717,398.547 112.263 C 398.947 111.213,398.773 111.176,397.837 112.112 M332.920 221.892 C 333.287 221.970,333.512 222.158,333.419 222.309 C 333.326 222.460,333.401 222.583,333.587 222.583 C 334.250 222.583,333.666 221.844,332.966 221.797 C 332.296 221.751,332.293 221.757,332.920 221.892 " stroke="none" fill="#ec4d20" fill-rule="evenodd"></path></g>
`;

export const OLD_DOT_SVG = `
<svg version="1.1"
     baseProfile="full"
     width="128" height="128"
     xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="linearGradient3774">
      <stop
         style="stop-color:#808080;stop-opacity:1;"
         offset="0" />
      <stop
         style="stop-color:#555555;stop-opacity:1;"
         offset="1" />
    </linearGradient>
    <radialGradient
       xlink:href="#linearGradient3774"
       id="radialGradient3780"
       cx="80"
       cy="40"
       fx="80"
       fy="40"
       r="80"
       gradientUnits="userSpaceOnUse"
       spreadMethod="pad" />
  </defs>
  <circle cx="50%" cy="50%" r="50%" fill="url(#radialGradient3780)" />
</svg>
`;
