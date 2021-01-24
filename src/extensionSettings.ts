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
import * as vscode from 'vscode';

class ExtensionSettings {
    private static readonly DEFAULT_ASM3JAR_PATH = "./asm3.jar";
    private static readonly DEFAULT_SIMULATOR_HOST = "localhost";
    private static readonly DEFAULT_SIMULATOR_PORT = 41114;
    private static readonly DEFAULT_USE_BRK_MNEMONICS_AS_BREAKPOINTS = true;

    public static asm3JarPath = vscode.workspace.getConfiguration().get<string>('asm.assembler', ExtensionSettings.DEFAULT_ASM3JAR_PATH);
    public static simulatorHost = vscode.workspace.getConfiguration().get<string>('asm.simulatorHost', ExtensionSettings.DEFAULT_SIMULATOR_HOST);
    public static simulatorPort = vscode.workspace.getConfiguration().get<number>('asm.simulatorPort', ExtensionSettings.DEFAULT_SIMULATOR_PORT);
    public static useBRKMnemonicsAsBreakpoints = vscode.workspace.getConfiguration().get<boolean>('asm.brkHandling', ExtensionSettings.DEFAULT_USE_BRK_MNEMONICS_AS_BREAKPOINTS);

    public static updateValuesFromWorkspaceConfiguration() {
        ExtensionSettings.asm3JarPath = vscode.workspace.getConfiguration().get<string>('asm.assembler', ExtensionSettings.DEFAULT_ASM3JAR_PATH);
        ExtensionSettings.simulatorHost = vscode.workspace.getConfiguration().get<string>('asm.simulatorHost', ExtensionSettings.DEFAULT_SIMULATOR_HOST);
        ExtensionSettings.simulatorPort = vscode.workspace.getConfiguration().get<number>('asm.simulatorPort', ExtensionSettings.DEFAULT_SIMULATOR_PORT);
        ExtensionSettings.useBRKMnemonicsAsBreakpoints = vscode.workspace.getConfiguration().get<boolean>('asm.brkHandling', ExtensionSettings.DEFAULT_USE_BRK_MNEMONICS_AS_BREAKPOINTS);
    }
}
