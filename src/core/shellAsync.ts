import * as shell from "shelljs";

export default class ShellAsync {
  static exec(commandString: string): Promise<boolean> {
    return new Promise<boolean>((re, rt) => {
      let result = shell.exec(commandString, {
        async: true,
        silent: false,
      });
      result.on("error", (error) => rt(error));
      result.on("close", (code) => re(code === 0));
    });
  }
}
