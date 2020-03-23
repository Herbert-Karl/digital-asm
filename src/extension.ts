import * as fs from 'fs';
var java = require("java"); // used to interface with jar files
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    let parseAsm = vscode.commands.registerCommand('digital-asm.parse-asm', async (Uri: vscode.Uri) => {
        if(Uri===undefined) {
            // if the command isnt given an URI for the file, which shall be parsed, we try to infer the file meant via the active editor
            let help = vscode.window.activeTextEditor;
            if(help===undefined) {
                // if there is neither a given URI nor an active text editor, we can't parse and return while showing an error message
                vscode.window.showErrorMessage("No given or active file.");
                return;
            }
            Uri = help.document.uri;
        }

        let fileToParse = await vscode.workspace.openTextDocument(Uri);
        if(fileToParse.languageId!=='asm') {
            // if the file, which shall be parsed, doesn't match the asm languageId, we don't try to parse it and return while showing an error message
            vscode.window.showErrorMessage("Language of file isn't supported.");
            return;
        }

        java.classpath.push(path.join(__dirname + "/../" + 'asm3.jar')); // ToDo: get jar Path from plugin settings

        try {
            let Parser = java.import('de.neemann.assembler.parser.Parser');
            let asmParser = new Parser(fileToParse.getText());
            let program = asmParser.parseProgramSync(); // 'Sync' Suffix comes from the java module because reasons ...
            // because the writeHex Funtion in asm3 isnt public, we re-implement its functionality
            let HexFormatter = java.import('de.neemann.assembler.asm.formatter.HexFormatter');
            let hexPath = Uri.path.replace(".asm", ".hex");
            let PrintStream = java.import('java.io.PrintStream');
            let hexFile = new PrintStream(hexPath);
            let hexFormatter = new HexFormatter(hexFile);
            program.traverseSync(hexFormatter); // 'Sync' Suffix comes from the java module because reasons ...
        } catch (ex) {
            vscode.window.showErrorMessage(ex); // ToDo: better error handling and better error logging
            return;
        }
        
    });

    // adding the implementation of the commands to the context of the extension, 
    //so that the implementations will be executed, when the commands are called
    context.subscriptions.push(parseAsm);
}

// this method is called when your extension is deactivated
export function deactivate() {}