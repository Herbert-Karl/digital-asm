/*
Copyright © 2021 Herbert Bärschneider

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
import * as vscode from 'vscode'; // The module 'vscode' contains the VS Code extensibility API
import { AsmHoverProvider } from './asmHoverProvider';
import { AsmCompletionItemProvider } from './asmCompletionItemProvider';
import { AsmDebugTrackerFactory } from './asmDebugTracker';
import { ExtensionSettings } from './extensionSettings';
import { inferTargetFileFromActiveEditor } from './utility';
import { AsmDebugConfigurationProvider } from './AsmDebugConfigurationProvider';
import { commandWrapper, commandParseAsm, commandRunAsm } from './commands';

// an extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    
    vscode.workspace.onDidChangeConfiguration(() => {
        ExtensionSettings.updateValuesFromWorkspaceConfiguration();
    });

    let parseAsm = vscode.commands.registerCommand('digital-asm.parse-asm', commandWrapper(commandParseAsm));
    let runAsm = vscode.commands.registerCommand('digital-asm.execute-asm', commandWrapper(commandRunAsm));
    let deriveFile = vscode.commands.registerCommand('digital-asm.getFile', () => {
        return inferTargetFileFromActiveEditor().fsPath;
    });

    let completionItemProvider = vscode.languages.registerCompletionItemProvider('asm', new AsmCompletionItemProvider());
    let hoverProvider = vscode.languages.registerHoverProvider('asm', new AsmHoverProvider());
    let asmDebugConfigProvider = vscode.debug.registerDebugConfigurationProvider('digital-conn', new AsmDebugConfigurationProvider());

    let trackerFactory = vscode.debug.registerDebugAdapterTrackerFactory('digital-conn', new AsmDebugTrackerFactory());

    // adding the implementation of the commands to the context of the extension,
    //so that the implementations will be executed, when the commands are called
    context.subscriptions.push(parseAsm, runAsm, deriveFile);

    // adding our providers to the context of the extension
    context.subscriptions.push(completionItemProvider, hoverProvider, asmDebugConfigProvider, trackerFactory);

}

export function deactivate() {}
