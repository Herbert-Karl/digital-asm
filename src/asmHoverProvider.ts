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
import { mnemonicsArray, AsmMnemonic } from './mnemonics';

// class implementing hovers for our asm mnemonics
export class AsmHoverProvider implements vscode.HoverProvider {

    private hoverMap: Map<string, vscode.Hover>;

    constructor() {
        this.hoverMap = new Map<string, vscode.Hover>();
        // creating hovers for each mnemonic and putting all of them into the map with the mnemonic as key for easy retrieval
        mnemonicsArray.forEach((elem: AsmMnemonic) => {
            let newHover = new vscode.Hover(elem.detail + "\n\n" + elem.doc);
            this.hoverMap.set(elem.label, newHover);
        });
    }

    public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        let range = document.getWordRangeAtPosition(position);
        let word = document.getText(range);

        return this.hoverMap.get(word);
    }
}
