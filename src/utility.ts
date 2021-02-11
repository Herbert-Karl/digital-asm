import * as vscode from 'vscode';

export function inferTargetFileFromActiveEditor(): vscode.Uri {
    let activeTextEditor = vscode.window.activeTextEditor;
    if (activeTextEditor === undefined) {
        let noFileToBeInferedError = new Error("No active file to use for debugging.");
        notifyUserAboutError(noFileToBeInferedError);
        throw noFileToBeInferedError;
    }
    return activeTextEditor.document.uri;
}

export function isSupportedLanguage(file: vscode.TextDocument): boolean {
    return file.languageId === 'asm';
}

export function notifyUserAboutError(err: Error) {
    vscode.window.showErrorMessage(err.message);
    console.error(err.message);
}
