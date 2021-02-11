import * as fs from 'fs';
import * as vscode from 'vscode';
import { ExtensionSettings } from './extensionSettings';
import { inferTargetFileFromActiveEditor } from './utility';
import { commandParseAsm } from "./commands";

export class AsmDebugConfigurationProvider implements vscode.DebugConfigurationProvider {

    // function for supplementing missing values into the debug configuration and or modifiying existing ones
    // gets called before variables are substituted in the launch configuration
    // we use it to put necessary information for launching the debugger into the configuration
    public async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, debugConfiguration: vscode.DebugConfiguration, token?: vscode.CancellationToken | undefined): Promise<vscode.DebugConfiguration | null> {

        let fileToDebug: string | undefined = debugConfiguration.file;

        // if the debug configuration isnt given a path for the file, we try to infer the file meant via the active editor
        if (fileToDebug === undefined || !fs.existsSync(fileToDebug)) {
            fileToDebug = inferTargetFileFromActiveEditor().fsPath;
        }

        // we parse the asm file to create .hex and .map files, which are up to date with the current .asm file
        commandParseAsm(await vscode.workspace.openTextDocument(vscode.Uri.file(fileToDebug)));

        debugConfiguration = this.addAsmSpecificValuesToDebugConfiguration(debugConfiguration, fileToDebug);
        return debugConfiguration;
    }

    private addAsmSpecificValuesToDebugConfiguration(debugConfiguration: vscode.DebugConfiguration, targetFile: string): vscode.DebugConfiguration {
        debugConfiguration.pathToAsmFile = targetFile;
        debugConfiguration.pathToHexFile = targetFile.replace(".asm", ".hex");
        debugConfiguration.pathToAsmHexMapping = targetFile.replace(".asm", ".map");
        debugConfiguration.setBreakpointsAtBRK = ExtensionSettings.useBRKMnemonicsAsBreakpoints;
        debugConfiguration.HostOfSimulator = ExtensionSettings.simulatorHost;
        debugConfiguration.PortOfSimulator = ExtensionSettings.simulatorPort;
        return debugConfiguration;
    }
}
