import { createStore, combineReducers } from 'redux'

/* =================== Initial State ================ */
var initial_state = {
    columnSchema: [
        { name: "name",         title: "Наименование",  order: 0,   size: 50,   header_textAlign: false,            column_textAlign: false,           type: 'text',   validation: { required: true, minLength: 3, maxLength: 128 }  },
        { name: "color",        title: "Цвет",          order: 2,   size: 19,   header_textAlign: false,            column_textAlign: false,           type: 'enum',   validation: { required: false },   required: true,   params: [ "Черный", "Белый", "Красный", "Зеленый", "Синий", "Желтый", "Бирюзовый", "Хаки" ]  },
        { name: "price",        title: "Цена",          order: 3,   size: 10,   header_textAlign: 'text-center',    column_textAlign: 'text-right',    type: 'price',  validation: { required: true, min: 1 }, params: "$" },
        { name: "availability", title: "Наличие",       order: 1,   size: 14,   header_textAlign: false,            column_textAlign: false,           type: 'bool' }
    ],
    rows: [
        [
            { column: 0,    value: "Шариковая ручка",      timestamp: 0 },
            { column: 1,    value: 1,                      timestamp: 0 },
            { column: 2,    value: 0.3,                    timestamp: 0 },
            { column: 3,    value: false,                  timestamp: 0 }
        ], [
            { column: 0,    value: "Коллер",               timestamp: 0 },
            { column: 1,    value: 3,                      timestamp: 0 },
            { column: 2,    value: 3.5,                    timestamp: 0 },
            { column: 3,    value: true,                   timestamp: 0 }
        ],[
            { column: 0,    value: "Степлер",              timestamp: 0 },
            { column: 1,    value: 0,                      timestamp: 0 },
            { column: 2,    value: 0.3,                    timestamp: 0 },
            { column: 3,    value: true,                   timestamp: 0 }
        ],[
            { column: 0,    value: "Чехол для телефона",   timestamp: 0 },
            { column: 1,    value: 4,                      timestamp: 0 },
            { column: 2,    value: 6,                      timestamp: 0 },
            { column: 3,    value: false,                  timestamp: 0 }
        ]
    ]
};

/* ===================================================================== Actions ============================================================================= */
const ADD_RECORD = "ADD_RECORD";
const REMOVE_RECORD = "REMOVE_RECORD";
const UPDATE_RECORD = "UPDATE_RECORD";
const UPDATE_CELL = "UPDATE_CELL";
const UPDATE_BOOL_COLUMN = "UPDATE_BOOL_COLUMN";
const UPDATE_COLUMN_ORDER = "UPDATE_COLUMN_ORDER";
const UPDATE_COLUMN_SIZE = "UPDATE_COLUMN_SIZE";

export function addRecord(record) {
    return { type: ADD_RECORD, value: record };
}

export function removeRecord(index) {
    return { type: REMOVE_RECORD, index: index };
}

export function updateRecord(index, new_record) {
    return { type: UPDATE_RECORD, index: index, value: new_record };
}

export function updateCell(row, index, new_value) {
    return { type: UPDATE_CELL, row: row, index: index, value: new_value };
}

export function updateBoolColumn(index, new_value) {
    return { type: UPDATE_BOOL_COLUMN, index: index, value: new_value };
}

export function updateColumnOrder(index, new_order) {
    return { type: UPDATE_COLUMN_ORDER, index: index, value: new_order };
}

export function updateColumnSize(column_schema) {
    return { type: UPDATE_COLUMN_SIZE, value: column_schema };
}


/* ===================================================================== Reducers ============================================================================= */
var tableRecordsHandler = function (state, action) {
    if(action.type === ADD_RECORD)
        return [
            ...state,
            Object.assign(action.value, { timestamp: Date.now() })
        ]
    
    if(action.type === UPDATE_RECORD)
        return state.map((record, index) => {
            if(index === action.index)
                return action.value;
            return record;
        })

    if(action.type === REMOVE_RECORD)
        return state.filter((record, index) => {
            return index !== action.index;
        })

    if(action.type === UPDATE_CELL)
        return state.map((record, index) => {
            if(index === action.row) {
                return record.map((cell, index) => {
                    if(index === action.index)
                        return Object.assign({}, cell, { value: action.value });

                    return cell;
                });
            }
            return record;
        })

    if(action.type === UPDATE_BOOL_COLUMN)
        return state.map((record, index) => {
            return record.map((cell, index) => {
                if(cell.column === action.index)
                    return Object.assign({}, cell, { value: action.value });
                return cell;
            });
        })

    return state;
};

var tableColumnSchemaHandler = function (state, action) {
    if(action.type === UPDATE_COLUMN_ORDER) {
        var a = action.index;
        var b = action.value;

        return state.map((x,i)=>{
            if(x.order === a)
                return Object.assign({}, x, { order: b });
            else if(a < b && x.order > a && x.order <= b)
                return Object.assign({}, x, { order: x.order-1 });
            else if(a > b && x.order < a && x.order >= b)
                return Object.assign({}, x, { order: x.order+1 });
            return x;
        });
    }

    if(action.type === UPDATE_COLUMN_SIZE){
        return state.map((x,i)=>{
            if(x.order === action.value.column1[0]){
                return Object.assign({}, x, { size: action.value.column1[1] })
            }

            if(x.order === action.value.column2[0]){
                return Object.assign({}, x, { size: action.value.column2[1] })
            }
            return x
        })
    }

    return state;
};

function rootReducer(state, action) {
    return {
        columnSchema: tableColumnSchemaHandler(state.columnSchema, action),
        rows: tableRecordsHandler(state.rows, action)
    }
}

/* ===================================================================== Store ============================================================================= */
export const store = createStore(rootReducer, initial_state);
