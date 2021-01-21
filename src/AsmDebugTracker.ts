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

// class implemented to log the messages of the debug adapter protocol between the vscode generic debug ui and a running debug adapter
// useful for checking, which requests and responses are send between those two as well as the content of those messages
// the messages are written to a read-only output channel
class AsmDebugTracker implements vscode.DebugAdapterTracker {

    private channel: vscode.OutputChannel;

    constructor() {
        this.channel = vscode.window.createOutputChannel("digital-asm DAP log");
    }

    public onWillStartSession() {
        this.channel.appendLine("Session with debug adapter starting ...");
    }

    public onWillReceiveMessage(message: any) {
        this.channel.appendLine("From VS Code: " + JSON.stringify(message));
    }

    public onDidSendMessage(message: any) {
        this.channel.appendLine("To VS Code: " + JSON.stringify(message));
    }

    public onWillStopSession() {
        this.channel.appendLine("Session with debug adapter ended");
    }

    dispose() {
        this.channel.dispose();
    }

}
// factory class for producing a tracker for a given debug session
export class AsmDebugTrackerFactory implements vscode.DebugAdapterTrackerFactory {

    // because we use the tracker only to log the messages exchanges in the debug session, we do not use the debug session object
    public createDebugAdapterTracker(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterTracker> {
        return new AsmDebugTracker();
    }
}
