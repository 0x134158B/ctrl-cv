import * as path from "path";

export default class SourceFile {
  /**
   * 根目录
   */
  root?: string;
  /**
   * 相对根目录的路径
   */
  internalPath: string;

  constructor(internalPath: string, root?: string) {
    this.internalPath = path.normalize(internalPath);
    this.root = root;
  }

  getPath(): string {
    if (!this.root) {
      return this.internalPath;
    }
    return path.resolve(this.root, this.internalPath);
  }
}
