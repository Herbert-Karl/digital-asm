import { spawnSync } from 'child_process';
import * as fs from 'fs';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import { RemoteInterface } from './remoteInterface';

// plugin settings
let asm3JarPath = vscode.workspace.getConfiguration().get<string>('asm.assembler', "./asm3.jar");
let simulatorHost = vscode.workspace.getConfiguration().get<string>('asm.simulatorHost', "127.0.0.1");
let simulatorPort = vscode.workspace.getConfiguration().get<number>('asm.simulatorPort', 41114);

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {  
    // if the configuration of the workspace changes, we simply override our values referencing the plugin settings
    vscode.workspace.onDidChangeConfiguration(() => {
        asm3JarPath = vscode.workspace.getConfiguration().get<string>('asm.assembler', "./asm3.jar");
        simulatorHost = vscode.workspace.getConfiguration().get<string>('asm.simulatorHost', "127.0.0.1");
        simulatorPort = vscode.workspace.getConfiguration().get<number>('asm.simulatorPort', 41114);
    });

    // registering commands 
    let parseAsm = vscode.commands.registerCommand('digital-asm.parse-asm', commandFrame(commandParseAsm));
    let runAsm = vscode.commands.registerCommand('digital-asm.execute-asm', commandFrame(commandRunAsm));

    // registering our provider for completions
    let completionProvider = vscode.languages.registerCompletionItemProvider('asm', new AsmCompletionItemProvider());

    // adding the implementation of the commands to the context of the extension, 
    //so that the implementations will be executed, when the commands are called
    context.subscriptions.push(parseAsm, runAsm, completionProvider);
}

// this method is called when your extension is deactivated
export function deactivate() {}

// function implementing the parsing of a .asm file into a .hex file
// for this, the function uses spawns a child process which executes the jar file with the given asm file 
// we wait for the process to finish in order to ensure that following steps have the .hex and .lst files written to the file system
// params:
// the function takes the file, that shall be parsed, as a TextDocument
// return:
// if there is an error, an error message is returned as string
// if the function ended successful, `null` will be returned
// expects:
// TextDocument is a .asm file
function commandParseAsm(td: vscode.TextDocument): string | null {
    try {
        let pathToHex = td.uri.path;
        let child = spawnSync('java', ["-jar", asm3JarPath, pathToHex]);
    } catch (ex) {
        vscode.window.showErrorMessage(ex.message);
        console.error(ex);
        return ex.message;
    }
    return null;
}

// function implementing the execution of a .asm file
// for this, the function uses a remoteInterface to access the digital simulator
// the .asm file is parsed before running it
// params:
// the function takes the file, that shall be run, as a TextDocument
// return:
// if there is an error, an error message is returned as string
// if the function ended successful, `null` will be returned
// futhermore the content of the file will start to run in the digitial simulator
// expects:
// TextDocument is a .asm file
// digital simulator program is run on the local machine
function commandRunAsm(td: vscode.TextDocument): string | null {
    try {
        let error = commandParseAsm(td);
        if (error !== null) {
            return error;
        }
        let hexPath = td.uri.fsPath.replace(".asm", ".hex");

        let remoteInterface = new RemoteInterface(simulatorHost, simulatorPort);
        remoteInterface.start(hexPath)
            .catch( (err) => {
                vscode.window.showErrorMessage(err.message);
                console.error(err);
            });
    } catch (ex) {
        vscode.window.showErrorMessage(ex.message);
        console.error(ex);
        return ex.message;
    }
    return null;
}

// function implementing checks before executing a given command 
// params:
// function implementing the command, which shall be executed with the given file
// return:
// an asyncronise function which wraps the command with checks for the given Uri, language of the File and the asm3 jar file
function commandFrame(Command: (td: vscode.TextDocument) => string | null): (Uri: vscode.Uri, ) => Promise<string | null> {
    return async function(Uri: vscode.Uri) {
        if(Uri===undefined) {
            // if the command isnt given an URI for the file, we try to infer the file meant via the active editor
            let help = vscode.window.activeTextEditor;
            if(help===undefined) {
                // if there is neither a given URI nor an active text editor, we return while showing an error message
                vscode.window.showErrorMessage("No given or active file.");
                console.error("No given or active file.");
                return "No given or active file.";
            }
            Uri = help.document.uri;
        }

        let fileToParse = await vscode.workspace.openTextDocument(Uri);

        if(fileToParse.languageId!=='asm') {
            // if the file doesn't match the asm languageId, we don't try to work with it and return while showing an error message
            vscode.window.showErrorMessage("Language of file isn't supported.");
            console.error("Language of file isn't supported.");
            return "Language of file isn't supported.";
        }

        if(!fs.existsSync(asm3JarPath)) {
            // if we don't find a file at the given path for the asm3.jar, we alert the user and abort
            // continuing would creating errors when trying to access the classes contained in the jar file
            vscode.window.showErrorMessage("Path for asm3.jar doesn't point to a existing file.");
            console.error("Path for asm3.jar doesn't point to a existing file.");
            return "Path for asm3.jar doesn't point to a existing file.";
        }

        // execution of the given command
        return Command(fileToParse);
    };
}

class AsmCompletionItemProvider implements vscode.CompletionItemProvider {

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        // ...
        let completionItems = new Array<vscode.CompletionItem>();

        // --- instructions ---
        //
        completionItems.push(createCompletionItem("BRK", "Stops execution by stopping the simulator.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("NOP", "Does nothing.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("MOV", "Move the content of Rs to register Rd.", vscode.CompletionItemKind.Operator));
        //
        completionItems.push(createCompletionItem("ADD", "Adds the content of register Rs to register Rd without carry.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("ADC", "Adds the content of register Rs to register Rd with carry.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("ADDI", "Adds the constant [const] to register Rd without carry.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("ADDIs", "Adds the constant [const] to register Rd without carry. (0<=[const]<=31)", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("ADCI", "Adds the constant [const] to register Rd with carry.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("ADCIs", "Adds the constant [const] to register Rd with carry. (0<=[const]<=31)", vscode.CompletionItemKind.Operator));
        //
        completionItems.push(createCompletionItem("SUB", "Subtracts the content of register Rs to register Rd without carry.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("SBC", "Subtracts the content of register Rs to register Rd with carry.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("SUBI", "Substracts a constant [const] to register Rd without carry.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("SUBIs", "Substracts a constant [const] to register Rd without carry. (0<=[const]<=31)", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("SBCI", "Substracts a constant [const] to register Rd with carry.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("SBCIs", "Substracts a constant [const] to register Rd with carry. (0<=[const]<=31)", vscode.CompletionItemKind.Operator));
        //
        completionItems.push(createCompletionItem("MUL", "Multiplies the content of register Rs with register Rd and stores result in Rd.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("MULI", "Multiplies the constant [const] with register Rd and stores result in Rd.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("MULIs", "Multiplies the constant [const] with register Rd and stores result in Rd. (0<=[const]<=31)", vscode.CompletionItemKind.Operator));
        //
        completionItems.push(createCompletionItem("AND", "Stores Rs and Rd in register Rd.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("ANDI", "Stores Rd and [const] in register Rd.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("ANDIs", "Stores Rd and [const] in register Rd. (0<=[const]<=31)", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("OR", "Stores Rs or Rd in register Rd.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("ORI", "Stores Rd or [const] in register Rd.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("ORIs", "Stores Rd or [const] in register Rd. (0<=[const]<=31)", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("EOR", "Stores Rs xor Rd in register Rd.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("EORI", "Stores Rd xor [const] in register Rd.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("EORIs", "Stores Rd xor [const] in register Rd. (0<=[const]<=31)", vscode.CompletionItemKind.Operator));
        //
        completionItems.push(createCompletionItem("CMP", "Subtracts the content of register Rs from register Rd without carry, does not store the value.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("CPI", "Subtracts a constant [const] from register Rd without carry, does not store the value.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("CPIs", "Subtracts a constant [const] from register Rd without carry, does not store the value. (0<=[const]<=31)", vscode.CompletionItemKind.Operator));
        //
        completionItems.push(createCompletionItem("LSL", "Shifts register Rd by one bit to the left. A zero bit is filled in and the highest bit is moved to the carry bit.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("LSR", "Shifts register Rd by one bit to the right. A zero bit is filled in and the lowest bit is moved to the carry bit.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("ROL", "Shifts register Rd by one bit to the left. The carry bit is filled in and the highest bit is moved to the carry bit.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("ROR", "Shifts register Rd by one bit to the right. The carry bit is filled in and the lowest bit is moved to the carry bit.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("ROR", "Shifts register Rd by one bit to the right. The MSB remains unchanged and the lowest bit is moved to the carry bit.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("SWAP", "Swaps the high and low byte in register Rd", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("SWAPN", "Swaps the high and low nibbles of both bytes in register Rd.", vscode.CompletionItemKind.Operator));
        //
        completionItems.push(createCompletionItem("LDI", "Loads Register Rd with the constant value [const].", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("LDIs", "Loads Register Rd with the constant value [const]. (0<=[const]<=31)", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("LD", "Loads the value at memory address [Rs] to register Rd.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("LDS", "Loads the memory value at the location given by [const] to register Rd.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("LDSs", "Loads the memory value at the location given by [const] to register Rd. (0<=[const]<=31)", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("LDD", "Loads the value at memory address (Rs+[const]) to register Rd.", vscode.CompletionItemKind.Operator));
        //
        completionItems.push(createCompletionItem("ST", "Stores the content of register Rs to the memory at the address [Rd].", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("STS", "Stores the content of register Rs to memory at the location given by [const].", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("STSs", "Stores the content of register Rs to memory at the location given by [const]. (0<=[const]<=31)", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("STD", "Stores the content of register Rs to the memory at the address (Rd+[const]).", vscode.CompletionItemKind.Operator));
        //
        completionItems.push(createCompletionItem("BRCS", "Jumps to the address given by [const] if carry flag is set. (-256<=[const]<=255)", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("BREQ", "Jumps to the address given by [const] if zero flag is set. (-256<=[const]<=255)", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("BRMI", "Jumps to the address given by [const] if negative flag is set. (-256<=[const]<=255)", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("BRCC", "Jumps to the address given by [const] if carry flag is clear. (-256<=[const]<=255)", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("BRNE", "Jumps to the address given by [const] if zero flag is clear. (-256<=[const]<=255)", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("BRPL", "Jumps to the address given by [const] if negative flag is clear. (-256<=[const]<=255)", vscode.CompletionItemKind.Operator));
        //
        completionItems.push(createCompletionItem("RCALL", "Jumps to the address given by const, the returnaddress is stored in register Rd.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("RRET", "Jumps to the address given by register Rs.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("JMP", "Jumps to the address given by [const].", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("JMPs", "Jumps to the address given by [const].(-256<=[const]<=255)", vscode.CompletionItemKind.Operator));
        //
        completionItems.push(createCompletionItem("OUT", "Writes the content of register Rs to io location given by [const].", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("OUTs", "Writes the content of register Rs to io location given by [const]. (0<=[const]<=31)", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("OUTR", "Writes the content of register Rs to the io location [Rd].", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("IN", "Reads the io location given by [const] and stores it in register Rd.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("INs", "Reads the io location given by [const] and stores it in register Rd. (0<=[const]<=31)", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("INR", "Reads the io location given by (Rs) and stores it in register Rd.", vscode.CompletionItemKind.Operator));
        //
        completionItems.push(createCompletionItem("RETI", "Return from Interrupt.", vscode.CompletionItemKind.Operator));
        //
        // --- macros ---
        //
        completionItems.push(createCompletionItem("PUSH", "copies the value in the given register to the stack, decreases the stack pointer by one", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("POP", "copy value from the stack to the given register, adds one to the stack pointer", vscode.CompletionItemKind.Operator));
        //
        completionItems.push(createCompletionItem("CALL", "Jumps to the given Address, stores the return address on the stack.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("RET", "jumps to the address which is stored on top of the stack. decreases the stack pointer by 1+const. const is optional", vscode.CompletionItemKind.Operator));
        //
        completionItems.push(createCompletionItem("LEAVE", "moves BP to SP and pops BP from the stack", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("LEAVEI", "pops R0 and the flags from the stack", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("ENTER", "pushes BP on stack, copies SP to BP and reduces SP by the given constant", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("ENTERI", "pushes R0 and the flags to the stack", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("_SCALL", "jumps to the address given in const and stores the return address in the register RA. Before that RA is pushed to the stack, and after the return RA is poped of the stack again.", vscode.CompletionItemKind.Operator));
        //
        completionItems.push(createCompletionItem("DEC", "decreases the given register by one", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem("INC", "increases the given register by one", vscode.CompletionItemKind.Operator));
        
        //
        // --- directives ---
        //
        completionItems.push(createCompletionItem(".reg", "Sets an alias name for a register.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem(".long", "Reserves two words in the RAM. Its address is stored in addr.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem(".org", "Sets the actual code address. Is used to place code segments to fixed addresses.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem(".const", "Creates the given constant.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem(".include", "Includes the given file", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem(".word", "Reserves a single word in the RAM. Its address is stored in addr.", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem(".dorg", "Sets the actual data address. If used, assembler is switched to von Neumann mode", vscode.CompletionItemKind.Operator));
        completionItems.push(createCompletionItem(".data", "Copies the given values to the RAM. The address of the values is stored in addr.", vscode.CompletionItemKind.Operator));
        
        return completionItems;
    }

}

function createCompletionItem(label: string, doc: string, kind: vscode.CompletionItemKind): vscode.CompletionItem {
    let newCompletionItem = new vscode.CompletionItem(label, kind);
    newCompletionItem.documentation = doc;
    return newCompletionItem;
}