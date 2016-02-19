import {Component, Input, ChangeDetectionStrategy, Output, EventEmitter} from 'angular2/core'
import {StoreModel} from "../../models/StoreModel";
import {ISimpleGridEdit} from "./SimpleGrid";

@Component({
    selector: 'td[simpleGridData]',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        label {
            width: 200px;
            padding: 0;
            margin: 0;
        }
        .editableLabel {
            cursor: pointer;
        }
        input {
            width: 179px;
            padding: 0;
            margin: 0;
        }
        a {
            cursor: pointer;
        }
    `],
    template: `
         <label [ngClass]="{editableLabel: _editable}" *ngIf="!_editing" (click)="onEdit(true)">{{_value}}</label>
         <span *ngIf="_editing">
            <input value="{{_value2}}" [(ngModel)]="_value2"/>
                <a (click)="onEdit(false)" class="fa fa-check"></a>
         </span>
         
         <!--<img src="{{ item.iconPath }}" style="width: 40px; height: 40px"/>-->
         <!--&lt;!&ndash; <td [innerHtml]="item.day"></td> &ndash;&gt;-->
    `
})
export class SimpleGridData {
    private _value:string = '';
    private _value2:string = '';
    private storeModel:StoreModel;
    private _editable:boolean = false;
    private _editing:boolean = false;

    @Input()
    set item(i_storeModel:StoreModel) {
        this.storeModel = i_storeModel
    }

    @Input()
    set type(field) {
        this._value = this.storeModel.getKey(field)
    }

    @Input()
    set editable(i_editable) {
        this._editable = i_editable;
    }

    @Output()
    labelEdited:EventEmitter<any> = new EventEmitter();

    onEdit(value:boolean) {
        if (!this._editable)
            return;
        this._editing = value;
        if (this._editing)
            return;
        // done editing, so notify
        var payload:ISimpleGridEdit = {
            value: this._value2,
            item: this.storeModel
        }
        this.labelEdited.next(payload);

    }
}

