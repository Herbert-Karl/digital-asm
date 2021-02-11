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

export class AsmCompletionItemProvider implements vscode.CompletionItemProvider {

    private mnemonicCompletionItems: Array<vscode.CompletionItem>;

    constructor() {
        this.mnemonicCompletionItems = new Array<vscode.CompletionItem>();
        this.createCompletionItems();
    }

    private createCompletionItems() {
        mnemonicsArray.forEach((elem: AsmMnemonic) => {
            this.mnemonicCompletionItems.push(this.createCompletionItemFromAsmMnemonic(elem));
        });
    }

    private createCompletionItemFromAsmMnemonic(element: AsmMnemonic) {
        let itemKind = vscode.CompletionItemKind.Keyword;
        let newCompletionItem = new vscode.CompletionItem(element.label, itemKind);
        newCompletionItem.detail = element.detail;
        newCompletionItem.documentation = element.doc;
        return newCompletionItem;
    }

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        // because we only support static mnemonic completion items, we use prior created ones      
        return this.mnemonicCompletionItems;
    }
}
