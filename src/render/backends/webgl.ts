import type { AtlasSource, BenchBackend, SpriteData } from '../benchTypes.js';

const VERT = `
attribute vec2 a_pos;
attribute vec2 a_uv;
uniform vec2 u_res;
varying vec2 v_uv;
void main() {
  vec2 clip = (a_pos / u_res) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  v_uv = a_uv;
}`;

const FRAG = `
precision mediump float;
uniform sampler2D u_tex;
varying vec2 v_uv;
void main() {
  gl_FragColor = texture2D(u_tex, v_uv);
}`;

const FLOATS_PER_VERTEX = 4;
const VERTICES_PER_SPRITE = 6;

export class WebGLBackend implements BenchBackend {
  readonly name = 'WebGL';
  private readonly gl: WebGLRenderingContext;
  private readonly program: WebGLProgram;
  private readonly buffer: WebGLBuffer;
  private readonly texture: WebGLTexture;
  private readonly aPos: number;
  private readonly aUv: number;
  private readonly uRes: WebGLUniformLocation;
  private readonly uTex: WebGLUniformLocation;
  private readonly data: Float32Array;
  private cursor = 0;
  private atlas: AtlasSource | null = null;

  constructor(private readonly canvas: HTMLCanvasElement, maxSprites: number) {
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false });
    if (!gl) throw new Error('无法获取 webgl 上下文');
    this.gl = gl;

    this.program = this.compile(VERT, FRAG);
    this.aPos = gl.getAttribLocation(this.program, 'a_pos');
    this.aUv = gl.getAttribLocation(this.program, 'a_uv');
    this.uRes = gl.getUniformLocation(this.program, 'u_res') as WebGLUniformLocation;
    this.uTex = gl.getUniformLocation(this.program, 'u_tex') as WebGLUniformLocation;

    const buffer = gl.createBuffer();
    if (!buffer) throw new Error('无法创建顶点缓冲');
    this.buffer = buffer;
    this.data = new Float32Array(maxSprites * VERTICES_PER_SPRITE * FLOATS_PER_VERTEX);

    const texture = gl.createTexture();
    if (!texture) throw new Error('无法创建纹理');
    this.texture = texture;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private compile(vs: string, fs: string): WebGLProgram {
    const gl = this.gl;
    const make = (type: number, src: string): WebGLShader => {
      const sh = gl.createShader(type);
      if (!sh) throw new Error('无法创建 shader');
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        throw new Error(`shader 编译失败: ${gl.getShaderInfoLog(sh) ?? ''}`);
      }
      return sh;
    };
    const program = gl.createProgram();
    if (!program) throw new Error('无法创建 program');
    gl.attachShader(program, make(gl.VERTEX_SHADER, vs));
    gl.attachShader(program, make(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`program 链接失败: ${gl.getProgramInfoLog(program) ?? ''}`);
    }
    return program;
  }

  beginFrame(): void {
    const gl = this.gl;
    this.cursor = 0;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.063, 0.063, 0.078, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (this.atlas) {
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.atlas.image as TexImageSource);
    }
  }

  drawSprite(atlas: AtlasSource, sprite: SpriteData, px: number, py: number): void {
    this.atlas = atlas;
    const half = sprite.size / 2;
    const x0 = px - half;
    const y0 = py - half;
    const x1 = px + half;
    const y1 = py + half;
    const u0 = (sprite.cell % atlas.cols) / atlas.cols;
    const v0 = Math.floor(sprite.cell / atlas.cols) / atlas.cols;
    const u1 = u0 + 1 / atlas.cols;
    const v1 = v0 + 1 / atlas.cols;

    const d = this.data;
    let o = this.cursor;
    d[o++] = x0; d[o++] = y0; d[o++] = u0; d[o++] = v0;
    d[o++] = x1; d[o++] = y0; d[o++] = u1; d[o++] = v0;
    d[o++] = x1; d[o++] = y1; d[o++] = u1; d[o++] = v1;
    d[o++] = x0; d[o++] = y0; d[o++] = u0; d[o++] = v0;
    d[o++] = x1; d[o++] = y1; d[o++] = u1; d[o++] = v1;
    d[o++] = x0; d[o++] = y1; d[o++] = u0; d[o++] = v1;
    this.cursor = o;
  }

  endFrame(): number {
    const gl = this.gl;
    if (this.cursor === 0) return 0;
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.subarray(0, this.cursor), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, FLOATS_PER_VERTEX * 4, 0);
    gl.enableVertexAttribArray(this.aUv);
    gl.vertexAttribPointer(this.aUv, 2, gl.FLOAT, false, FLOATS_PER_VERTEX * 4, 2 * 4);
    gl.uniform2f(this.uRes, this.canvas.width, this.canvas.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.uTex, 0);
    gl.drawArrays(gl.TRIANGLES, 0, this.cursor / FLOATS_PER_VERTEX);
    return 1;
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteBuffer(this.buffer);
    gl.deleteTexture(this.texture);
    gl.deleteProgram(this.program);
  }
}
