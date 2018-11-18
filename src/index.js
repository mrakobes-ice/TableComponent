import React from 'react'
import { render, createPortal } from 'react-dom'
import { Provider, connect } from 'react-redux'
import { store, addRecord, removeRecord, updateRecord, updateCell, updateBoolColumn, updateColumnOrder, updateColumnSize } from './store-index'

/* App
    - Toolbar (add_row)
    - Table (resize_column, reorder_column, inline_edit_form)
       - Row
    - Dialog (add/edit form)
    - Form (edit form)
       - Field
* */


/*
*  Presentation Components:
*    TableComponent
*      RowComponent
*        CellComponent
*          ActionCellComponent
*        HeaderCellComponent
*          HeaderCellSelectorComponent
*
*  Container Components:
*
*
*  Other Components:
*    AddItemComponent
*
* */


class Chrome extends React.Component{
    constructor(props){
        super(props)
    }
    render() {
        return (
            <div className="chrome" style={{ width: '711px', height: '215px' }}>
                <div className="chrome-handle top-left"></div>
                <div className="chrome-handle top-right"></div>
                <div className="chrome-handle bottom-left"></div>
                <div className="chrome-handle bottom-right"></div>
                {this.props.children}
            </div>
        );
    }
}

function ValidateField( value, schema ) {
    if(schema.validation && schema.validation.required) {
        if(value === undefined)
            return `Поле "${schema.title}" не должно быть пустым!`;

        if ( schema.type === "text" ) {
            if(value.length === 0)
                return `Поле "${schema.title}" не должно быть пустым!`
            else if(value.length < schema.validation.minLength)
                return `Значение в поле "${schema.title}" слишком короткое!`
            else if(value.length > schema.validation.maxLength)
                return `Значение в поле "${schema.title}" слишком длинное!`
        }
        else if ( schema.type === "price" ) {
            if(value < schema.validation.min)
                return `Значение в поле "${schema.title}" меньше минимального "${schema.validation.min + schema.params} !"`
        }
        else if ( schema.type === "enum" ) {
            if(schema.params.indexOf(value) === -1)
                return `Выберите хотя-бы одно из значений в поле "${schema.title}" !"`
        }
    }

    return true;
}

/* ===================================================== Presentation Components ============================================================ */

function ToolbarAction({title, handler}) {
    return (
        <button className="toolbar-action" onClick={handler}>{title}</button>
    );
}

function ToolbarComponent(params){
    return (
        <div className="toolbar">
            {params.children}
        </div>
    );
}

function TableColumnsSchema({schema}) {
    return (
        <colgroup>
            {[...schema].sort((a,b)=>{
               if(a.order < b.order)
                   return -1;
               if(a.order > b.order)
                   return 1;
               return 0;
            }).map((column, index)=>( <col key={index} style={{ width: column.size + '%' }} /> )).concat([<col key={schema.length} style={{ width: '5%' }}/>])}
        </colgroup>
    )
}

function TableCell({value, schema, onCellEdit }){
    if(schema.type === "price")
        return (
            <>
                <span className="currency">{schema.params}</span>
                {value}
            </>
        );
    if(schema.type === "enum")
        return schema.params[value] || "";
    if(schema.type === "bool")
        return (
            <label>
                <input type="checkbox" onChange={function (e) { onCellEdit(e.target.checked); }} checked={value} />
                <span className="checkbox-chrome"></span>
            </label>
        );

    return value;
}

function TableRow({cells, onRemoveAction, schema, onCellEdit}) {
    return [...cells].sort((a,b)=>{
        var index1 = cells.findIndex(x=>x === a);
        var index2 = cells.findIndex(x=>x === b);

        if(schema[index1].order < schema[index2].order)
            return -1;
        if(schema[index1].order > schema[index2].order)
            return 1;
        return 0;
    }).map((cell, index)=>{
        return (
            <td key={index} className={[(cell.timestamp > 0 && (new Date(Date.now() - cell.timestamp).getHours() - new Date(0).getHours()) < 1 ? "changed": ""), (schema[cell.column].column_textAlign || "")].join(' ').trim() }>
                <TableCell value={cell.value} schema={ schema[cell.column] } onCellEdit={function (value) { onCellEdit(cell.column, value, schema[cell.column]) }} />
            </td>
        )
    }).concat([<td key={cells.length}>
        <a href="javascript:void(0)" onClick={ onRemoveAction } className="table-row-action"></a>
    </td>])
}

function TableRows({rows, columnSchema, onRecordEdit, onCellEdit, onRemoveAction}) {
    return <tbody>
        {
            rows.map((cells, index) => {
                return (
                    <tr key={index} onDoubleClick={function(){ onRecordEdit(index) }}>
                       <TableRow cells={cells}
                                 schema={columnSchema}
                                 onRemoveAction={ function (e) { e.preventDefault(); onRemoveAction(index) }}
                                 onCellEdit={function(cell, value, schema){ onCellEdit(index, cell, value, schema) }} />
                    </tr>
                )
            })
        }
    </tbody>
}

function TableHeadersRow({schema, onColumnEdit}) {

    return (
        <thead>
            <tr>
                {
                    [...schema].sort((a,b)=>{
                        if(a.order < b.order)
                            return -1;
                        if(a.order > b.order)
                            return 1;
                        return 0;
                    }).map((column, index)=>{
                        if(column.type === 'bool')
                            return (
                                <th key={index} className={ column.header_textAlign || ""}>
                                    <label className="check-switcher">
                                        {column.title}
                                        <input type="checkbox" onChange={function (e) { onColumnEdit(e.target.checked, schema.indexOf(column)) }}/>
                                        <span className="checkbox-chrome"></span>
                                    </label>
                                </th>
                            )

                        return ( <th key={index} className={ column.header_textAlign || ""}> {column.title} </th> )
                    }).concat([<th key={schema.length}></th>])
                }
            </tr>
        </thead>
    )
}

class TableComponent extends React.Component{
    constructor(params){
        super(params)
        this._tableRef = React.createRef()
    }
    _formSubmit_handler(fields, row, initial) {
        //onRecordInsert || onRecordEdit

        var errors = fields.map(x => (typeof x.value !== 'boolean' ? ValidateField(x.value, this.props.columnSchema.find(y=>y.name === x.key)) : undefined)).filter(x=> typeof x === 'string');
        if(errors.length > 0){
            return errors;
        }

        fields = fields.map((x => {
            return { column: this.props.columnSchema.findIndex(y=>y.name === x.key), value: x.value };
        }).bind(this));

        if(row === undefined && initial === undefined){
            this.props.onRecordInsert(fields);
        }
        else {
            this.props.onRecordEdit(fields, row, initial);
        }
        return true;
    };
    componentDidMount(){
        if(this.props.onOrderChanged)
            this._tableRef.current.addEventListener('onOrderChanged',this.props.onOrderChanged);

        if(this.props.onColumnResize)
            this._tableRef.current.addEventListener('onColumnResize',this.props.onColumnResize);
    }
    render() {
        var _dialog = React.createRef();

        return (
            <div className="table-component" ref={this._tableRef}>
                <ToolbarComponent>
                    <ToolbarAction title="Добавить" handler={(function () {
                        _dialog.current.show("Добавить запись", "Сохранить", { schema: this.props.columnSchema });
                    }).bind(this)}/>
                </ToolbarComponent>
                <div className="overflow-wrapper">
                    <table>
                        <TableColumnsSchema schema={this.props.columnSchema}/>
                        <TableHeadersRow schema={this.props.columnSchema} onColumnEdit={this.props.onColumnEdit.bind(this)}/>
                        <TableRows {...this.props} onRecordEdit={function (row) {
                            _dialog.current.show("Изменить запись", "Сохранить", {
                                index: row,
                                record: this.props.rows[ row ],
                                schema: this.props.columnSchema
                            });
                        }}/>
                    </table>
                </div>
                <FormDialogComponent ref={_dialog} onSubmit={this._formSubmit_handler.bind(this)}/>
            </div>
        )
    }
}

function SelectorComponent({_enum, current, id, name}) {
    return (
        <select id={id} defaultValue={current} name={name}>
            {
                [<option key={-1} default value="">Выберите значение</option>].concat(_enum.map((item, index)=>{
                    return <option key={index} value={index}>{item}</option>
                }))
            }
        </select>
    )
}

class FormComponent extends React.Component{
    constructor(params){
        super(params)
        this.state = { schema: params.schema || [], record: params.record || [], idNameSpace: "form" }
    }

    render(){
        return (
                <table onChange={this.props.onMutateFields || ""}>
                    <tbody>
                    {
                        this.state.schema.map((item, index) =>{
                            var field = ""
                            var _key = this.state.idNameSpace + '_' + item.name

                            if(item.type === 'enum'){
                                field = <SelectorComponent id={_key} name={item.name} _enum={item.params} current={ (this.state.record[index] || {value:""}).value } />
                            }
                            else if(item.type === 'bool'){
                                field = (
                                    <label>
                                        <input id={_key} type="checkbox" name={item.name} defaultChecked={ (this.state.record[index] || {value:false}).value } />
                                        <span className="checkbox-chrome"></span>
                                    </label>
                                );
                            }
                            else if(item.type === 'price'){
                                field = (
                                    <>
                                        <span className="currency">{item.params}</span>
                                        <input id={_key} min="0" name={item.name} type="number" defaultValue={ (this.state.record[index] || {value:"0"}).value } />
                                    </>
                                )
                            }
                            else field = <input id={_key} name={item.name} type="text" defaultValue={ (this.state.record[index] || {value:""}).value } />

                            return (
                                <tr key={index}>
                                    <td><label htmlFor={_key}>{ item.title }</label>{ item.validation !== undefined && item.validation.required ? <span style={{color:'red', marginRight: "-.7em"}}>&nbsp;*</span> : "" }</td>
                                    <td>{ field }</td>
                                </tr>
                            )
                        })
                    }
                    </tbody>
                </table>
        )
    }
}

class DialogComponent extends React.Component{
    constructor(props){
        super(props)
        this.state = { isVisible: false, title: "", submitBtnTitle: "" }
        this.dialogRef = React.createRef();
    }
    componentDidMount(){
        this.dialogRef.current.addEventListener('click', (function (e) {
            if(e.target === e.currentTarget)
                this.close();
        }).bind(this));

        this.dialogRef.current.querySelector('.dialog-client').addEventListener('submit', (function (e) {
            e.preventDefault();

            if(this.props.onSubmit) {
                var _result = this.props.onSubmit(Array.from(e.target.querySelectorAll('input:not([type="submit"]),select')).map(x => {
                        return { 'key': x.name, 'value': x.type === 'radio' || x.type === 'checkbox' ? x.checked : x.value }
                    })
                );

                if ( _result === true) {
                    this.close();
                }
            }
        }).bind(this));
    }
    componentWillUnmount(){
        this.dialogRef.current.removeEventListener('click');
    }

    //additionalParams - дополнительные параметры, передаваемые дочерние компоненты
    show(title, btnTitle) {
        this.setState({ isVisible: true, title: title, submitBtnTitle: btnTitle })
    }
    close(){
        this.additionalProps = {}
        this.setState(Object.assign({},this.state,{ isVisible: false }));
    }

    render(){
        return createPortal(
            <div className={ ["dialog", this.state.isVisible ? "active": ""].join(' ').trim() } ref={this.dialogRef}>
                <form className="dialog-client">
                    <div className="dialog-header">
                        <h1 className="title">{ this.state.title }</h1>
                    </div>
                    { this.state.isVisible ? this.props.children : "" }
                    <div className="dialog-footer">
                        <input type="submit" value={ this.state.submitBtnTitle } />
                    </div>
                </form>
            </div>
            , document.querySelector("body")
        )
    }
}

class FormDialogComponent extends React.Component{
    constructor(props){
        super(props)
        this.dialogRef = React.createRef()
        this.state = { _additionalParams: {}, validationStatus: [] }
    }

    show(title, btnTitle, additionalParams) {
        this.setState({_additionalParams: additionalParams});
        this.dialogRef.current.show(title, btnTitle)
    }

    onMutateFields(){
        this.setState(Object.assign({}, this.state, { validationStatus : [] }))
    }

    onSubmit(form){
        var _result = this.props.onSubmit(form, this.state._additionalParams.index, this.state._additionalParams.record)

        if ( Array.isArray(_result) && _result.length > 0) {
            this.setState(Object.assign({}, this.state, { validationStatus: _result }))
        }
        else this.onMutateFields.call(this)

        return _result
    }

    render(){
        return (
            <DialogComponent { ...this.props } ref={this.dialogRef} onSubmit={this.onSubmit.bind(this)} >
                <FormComponent { ...this.state._additionalParams } onMutateFields={this.onMutateFields.bind(this)} />
                <ValidationResult messages={this.state.validationStatus} />
            </DialogComponent>
        )
    }
}

function ValidationResult(props){
        return (
            <ul className="validationStaus">
                { (props.messages || []).map((x,i) => <li key={i}>{x}</li>) }
            </ul>
        )
}


/* ===================================================== Container Components ============================================================ */

const TableContainer = connect(
        state=>state,
        (dispatch, props) => {
            return {
                onRecordInsert: function (value) {
                    dispatch(addRecord(value));
                    //console.log('onRecordInsert')
                },
                onRecordEdit: function (value,row) {
                    dispatch(updateRecord(row, value))
                    //console.log('onRecordEdit',row, value)
                },
                onCellEdit: function (row, column, value, type) {
                    dispatch(updateCell(row, column, value))
                    //console.log('onCellEdit',row, column, value, type)
                },
                onColumnEdit: function (value, column) {
                    dispatch(updateBoolColumn(column, value))
                    console.log('onColumnEdit', value, column)
                },
                onRemoveAction: function (row) {
                    dispatch(removeRecord(row))
                    console.log('onRemoveAction',row)
                },
                onOrderChanged: function (e) {
                    dispatch(updateColumnOrder(e.additionalData._old, e.additionalData._new))
                    console.log('onOrderChanged',e.additionalData)
                },
                onColumnResize: function (e) {
                    dispatch(updateColumnSize(e.additionalData))
                    console.log('onColumnResize',e.additionalData)
                }
            }
        }
    )(TableComponent);



/* ===================================================== Other Components ============================================================ */

function App() {
    return (
        <Chrome>
            <TableContainer />
        </Chrome>
    )
}

render(<Provider store={ store }>
        <App />
       </Provider>
    , document.getElementById('root'))