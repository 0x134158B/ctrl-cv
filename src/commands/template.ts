interface ITemplate {
  /**
   * 模板名
   */
  name: string;

  /**
   * 描述
   */
  description?: string;

  /**
   * 标签
   */
  tags?: string[];

  /**
   * 模板源
   */
  sources: ITemplateSource;

  /**
   * 根据文件名排除模板源内的文件
   */
  exclude?: string[];

  /**
   * 根据关键字替换文件名和文件内容
   */
  replace?: {
    files: string[];
    sign: string;
  };

  /**
   * 预设脚本
   */
  script?: string;
}

interface ITemplateSource {
  /**
   * 模板源git地址，如果为本地模板源则不填
   */
  git?: string;

  /**
   * git branch or tag
   */
  bot?: string;

  /**
   * 模板源的绝对路径，如果模板源为git则为git源内部的绝对路径
   */
  path?: string;

  /**
   * 表示模板为单文件模板
   */
  isfile?: boolean;
}

export default ITemplate;
