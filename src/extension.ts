import * as fs from 'fs';
var java = require("java"); // used to interface with jar files
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // plugin settings
    let asm3JarPath = vscode.workspace.getConfiguration().get<string>('asm.assembler', "./asm3.jar");
    // if the configuration of the workspace changes, we simply override our values referencing the plugin settings
    vscode.workspace.onDidChangeConfiguration(() => {
        asm3JarPath = vscode.workspace.getConfiguration().get<string>('asm.assembler', "./asm3.jar");
    });

    // registering commands 

    let parseAsm = vscode.commands.registerCommand('digital-asm.parse-asm', async (Uri: vscode.Uri) => {
        if(Uri===undefined) {
            // if the command isnt given an URI for the file, which shall be parsed, we try to infer the file meant via the active editor
            let help = vscode.window.activeTextEditor;
            if(help===undefined) {
                // if there is neither a given URI nor an active text editor, we can't parse and return while showing an error message
                vscode.window.showErrorMessage("No given or active file.");
                return "No given or active file.";
            }
            Uri = help.document.uri;
        }

        let fileToParse = await vscode.workspace.openTextDocument(Uri);
        if(fileToParse.languageId!=='asm') {
            // if the file, which shall be parsed, doesn't match the asm languageId, we don't try to parse it and return while showing an error message
            vscode.window.showErrorMessage("Language of file isn't supported.");
            return "Language of file isn't supported.";
        }

        java.classpath.push(path.join(__dirname + "/../" + asm3JarPath));

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

            //cleanup
            hexFile.close(); // closing stream to unlock the file for futher FileSystem operations
        } catch (ex) {
            vscode.window.showErrorMessage(ex.message);
            console.error(ex);
            return ex.message;
        }
        return null;
        // return behavior:
        // if there is no error or problem while parsing, nothing is returned
        // if there is an error, a error message is returned as string
    });

    // adding the implementation of the commands to the context of the extension, 
    //so that the implementations will be executed, when the commands are called
    context.subscriptions.push(parseAsm);
}

// this method is called when your extension is deactivated
export function deactivate() {}