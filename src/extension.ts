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

// class containing our provided completions for asm files
class AsmCompletionItemProvider implements vscode.CompletionItemProvider {

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        // for collecting all of our completions
        let completionItems = new Array<vscode.CompletionItem>();

        // --- instructions ---
        //
        completionItems.push(createCompletionItem("BRK", "BRK", "Stops execution by stopping the simulator.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("NOP", "NOP", "Does nothing.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("MOV", "MOV Rd,Rs", "Move the content of Rs to register Rd.", vscode.CompletionItemKind.Keyword));
        //
        completionItems.push(createCompletionItem("ADD", "ADD Rd,Rs", "Adds the content of register Rs to register Rd without carry.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("ADC", "ADC Rd,Rs", "Adds the content of register Rs to register Rd with carry.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("ADDI", "ADDI Rd,[const]", "Adds the constant [const] to register Rd without carry.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("ADDIs", "ADDIs Rd,[const]", "Adds the constant [const] to register Rd without carry. (0<=[const]<=31)", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("ADCI", "ADCI Rd,[const]", "Adds the constant [const] to register Rd with carry.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("ADCIs", "ADCIs Rd,[const]", "Adds the constant [const] to register Rd with carry. (0<=[const]<=31)", vscode.CompletionItemKind.Keyword));
        //
        completionItems.push(createCompletionItem("SUB", "SUB Rd,Rs", "Subtracts the content of register Rs to register Rd without carry.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("SBC", "SBC Rd,Rs", "Subtracts the content of register Rs to register Rd with carry.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("SUBI", "SUBI Rd,[const]", "Substracts a constant [const] to register Rd without carry.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("SUBIs", "SUBIs Rd,[const]", "Substracts a constant [const] to register Rd without carry. (0<=[const]<=31)", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("SBCI", "SBCI Rd,[const]", "Substracts a constant [const] to register Rd with carry.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("SBCIs", "SBCIs Rd,[const]", "Substracts a constant [const] to register Rd with carry. (0<=[const]<=31)", vscode.CompletionItemKind.Keyword));
        //
        completionItems.push(createCompletionItem("MUL", "MUL Rd,Rs", "Multiplies the content of register Rs with register Rd and stores result in Rd.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("MULI", "MULI Rd,[const]", "Multiplies the constant [const] with register Rd and stores result in Rd.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("MULIs", "MULIs Rd,[const]", "Multiplies the constant [const] with register Rd and stores result in Rd. (0<=[const]<=31)", vscode.CompletionItemKind.Keyword));
        //
        completionItems.push(createCompletionItem("AND", "AND Rd,Rs", "Stores Rs and Rd in register Rd.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("ANDI", "ANDI Rd,[const]", "Stores Rd and [const] in register Rd.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("ANDIs", "ANDIs Rd,[const]", "Stores Rd and [const] in register Rd. (0<=[const]<=31)", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("OR", "OR Rd,Rs", "Stores Rs or Rd in register Rd.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("ORI", "ORI Rd,[const]", "Stores Rd or [const] in register Rd.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("ORIs", "ORIs Rd,[const]", "Stores Rd or [const] in register Rd. (0<=[const]<=31)", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("EOR", "EOR Rd,Rs", "Stores Rs xor Rd in register Rd.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("EORI", "EORI Rd,[const]", "Stores Rd xor [const] in register Rd.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("EORIs", "EORIs Rd,[const]", "Stores Rd xor [const] in register Rd. (0<=[const]<=31)", vscode.CompletionItemKind.Keyword));
        //
        completionItems.push(createCompletionItem("CMP", "CMP Rd,Rs", "Subtracts the content of register Rs from register Rd without carry, does not store the value.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("CPI", "CPI Rd,[const]", "Subtracts a constant [const] from register Rd without carry, does not store the value.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("CPIs", "CPIs Rd,[const]", "Subtracts a constant [const] from register Rd without carry, does not store the value. (0<=[const]<=31)", vscode.CompletionItemKind.Keyword));
        //
        completionItems.push(createCompletionItem("LSL", "LSL Rd", "Shifts register Rd by one bit to the left. A zero bit is filled in and the highest bit is moved to the carry bit.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("LSR", "LSR Rd", "Shifts register Rd by one bit to the right. A zero bit is filled in and the lowest bit is moved to the carry bit.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("ROL", "ROL Rd", "Shifts register Rd by one bit to the left. The carry bit is filled in and the highest bit is moved to the carry bit.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("ROR", "ROR Rd", "Shifts register Rd by one bit to the right. The carry bit is filled in and the lowest bit is moved to the carry bit.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("ASR", "ASR Rd", "Shifts register Rd by one bit to the right. The MSB remains unchanged and the lowest bit is moved to the carry bit.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("SWAP", "SWAP Rd", "Swaps the high and low byte in register Rd", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("SWAPN", "SWAPN Rd", "Swaps the high and low nibbles of both bytes in register Rd.", vscode.CompletionItemKind.Keyword));
        //
        completionItems.push(createCompletionItem("LDI", "LDI Rd,[const]", "Loads Register Rd with the constant value [const].", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("LDIs", "LDI Rd,[const]", "Loads Register Rd with the constant value [const]. (0<=[const]<=31)", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("LD", "LD Rd,[Rs]", "Loads the value at memory address [Rs] to register Rd.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("LDS", "LDS Rd,[const]", "Loads the memory value at the location given by [const] to register Rd.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("LDSs", "LDSs Rd,[const]", "Loads the memory value at the location given by [const] to register Rd. (0<=[const]<=31)", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("LDD", "LDD Rd,[Rs+[const]]", "Loads the value at memory address (Rs+[const]) to register Rd.", vscode.CompletionItemKind.Keyword));
        //
        completionItems.push(createCompletionItem("ST", "ST [Rd],Rs", "Stores the content of register Rs to the memory at the address [Rd].", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("STS", "STS [const],Rs", "Stores the content of register Rs to memory at the location given by [const].", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("STSs", "STSs [const],Rs", "Stores the content of register Rs to memory at the location given by [const]. (0<=[const]<=31)", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("STD", "STD [Rd+[const]],Rs", "Stores the content of register Rs to the memory at the address (Rd+[const]).", vscode.CompletionItemKind.Keyword));
        //
        completionItems.push(createCompletionItem("BRCS", "BRCS [const]", "Jumps to the address given by [const] if carry flag is set. (-256<=[const]<=255)", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("BREQ", "BREQ [const]", "Jumps to the address given by [const] if zero flag is set. (-256<=[const]<=255)", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("BRMI", "BRMI [const]", "Jumps to the address given by [const] if negative flag is set. (-256<=[const]<=255)", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("BRCC", "BRCC [const]", "Jumps to the address given by [const] if carry flag is clear. (-256<=[const]<=255)", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("BRNE", "BRNE [const]", "Jumps to the address given by [const] if zero flag is clear. (-256<=[const]<=255)", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("BRPL", "BRPL [const]", "Jumps to the address given by [const] if negative flag is clear. (-256<=[const]<=255)", vscode.CompletionItemKind.Keyword));
        //
        completionItems.push(createCompletionItem("RCALL", "RCALL Rd,[const]", "Jumps to the address given by const, the returnaddress is stored in register Rd.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("RRET", "RRET Rs", "Jumps to the address given by register Rs.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("JMP", "JMP [const]", "Jumps to the address given by [const].", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("JMPs", "JMPs [const]", "Jumps to the address given by [const].(-256<=[const]<=255)", vscode.CompletionItemKind.Keyword));
        //
        completionItems.push(createCompletionItem("OUT", "OUT [const],Rs", "Writes the content of register Rs to io location given by [const].", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("OUTs", "OUTs [const],Rs", "Writes the content of register Rs to io location given by [const]. (0<=[const]<=31)", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("OUTR", "OUTR [Rd],Rs", "Writes the content of register Rs to the io location [Rd].", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("IN", "IN Rd,[const]", "Reads the io location given by [const] and stores it in register Rd.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("INs", "INs Rd,[const]", "Reads the io location given by [const] and stores it in register Rd. (0<=[const]<=31)", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("INR", "INR Rd,[Rs]", "Reads the io location given by (Rs) and stores it in register Rd.", vscode.CompletionItemKind.Keyword));
        //
        completionItems.push(createCompletionItem("RETI", "RETI", "Return from Interrupt.", vscode.CompletionItemKind.Keyword));
        //
        // --- macros ---
        //
        completionItems.push(createCompletionItem("PUSH",  "PUSH Rs", "copies the value in the given register to the stack, decreases the stack pointer by one", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("POP", "POP Rd", "copy value from the stack to the given register, adds one to the stack pointer", vscode.CompletionItemKind.Keyword));
        //
        completionItems.push(createCompletionItem("CALL", "CALL [const]", "Jumps to the given Address, stores the return address on the stack.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("RET", "RET [const]", "jumps to the address which is stored on top of the stack. decreases the stack pointer by 1+const. const is optional", vscode.CompletionItemKind.Keyword));
        //
        completionItems.push(createCompletionItem("LEAVE", "LEAVE", "moves BP to SP and pops BP from the stack", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("LEAVEI", "LEAVEI", "pops R0 and the flags from the stack", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("ENTER", "ENTER [const]", "pushes BP on stack, copies SP to BP and reduces SP by the given constant", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("ENTERI", "ENTERI", "pushes R0 and the flags to the stack", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("_SCALL", "_SCALL [const]", "jumps to the address given in const and stores the return address in the register RA. Before that RA is pushed to the stack, and after the return RA is poped of the stack again.", vscode.CompletionItemKind.Keyword));
        //
        completionItems.push(createCompletionItem("DEC", "DEC Rd", "decreases the given register by one", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem("INC", "INC Rd", "increases the given register by one", vscode.CompletionItemKind.Keyword));
        
        //
        // --- directives ---
        //
        completionItems.push(createCompletionItem(".reg", ".reg alias Rs", "Sets an alias name for a register.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem(".long", ".long addr", "Reserves two words in the RAM. Its address is stored in addr.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem(".org", ".org addr", "Sets the actual code address. Is used to place code segments to fixed addresses.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem(".const", ".const ident const", "Creates the given constant.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem(".include", ".include \"filename\"", "Includes the given file", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem(".word", ".word addr", "Reserves a single word in the RAM. Its address is stored in addr.", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem(".dorg", ".dorg addr", "Sets the actual data address. If used, assembler is switched to von Neumann mode", vscode.CompletionItemKind.Keyword));
        completionItems.push(createCompletionItem(".data", ".data addr value(,value)*", "Copies the given values to the RAM. The address of the values is stored in addr.", vscode.CompletionItemKind.Keyword));
        
        return completionItems;
    }

}

// helper function
// used to create CompletionItems and set wanted attributes
function createCompletionItem(label: string, detail: string, doc: string, kind: vscode.CompletionItemKind): vscode.CompletionItem {
    let newCompletionItem = new vscode.CompletionItem(label, kind);
    newCompletionItem.detail = detail;
    newCompletionItem.documentation = doc;
    return newCompletionItem;
}