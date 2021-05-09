import * as shell from "shelljs";

function shellExecAsync(commandString: string): Promise<boolean> {
  return new Promise<boolean>((re, rt) => {
    //shell.config.execPath = shell.which("node").toString();
    let result = shell.exec(commandString, {
      async: true,
      silent: false,
    });
    result.on("error", (error) => rt(error));
    result.on("close", (code) => re(code === 0));
  });
}

export { shellExecAsync };
