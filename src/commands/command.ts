import { ExtensionContext, Uri } from "vscode";

export default interface ICommand {
  handle(context: ExtensionContext, args: Uri[]): Promise<void>;
}
