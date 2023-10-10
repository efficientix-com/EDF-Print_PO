/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/record','N/log','N/search'],
/**
 * @param{currentRecord} currentRecord
 * @param{record} record
 */
function(currentRecord, record,log,search) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     * NOTA: El proceso no funciona en cargas masivas
     */
    function pageInit(scriptContext) {
        
    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {
        try{
            var objRecord = scriptContext.currentRecord;
            log.debug({title: 'objRecord', details: objRecord});
            if(scriptContext.sublistId == 'item'){
                
                if(scriptContext.fieldId =="custcol_tkio_term_pago"){
                    var terminos = objRecord.getCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_tkio_term_pago'});
                    var terminoSearch = search.lookupFields({type: 'term',id: terminos,columns: ['name']});
                    var terminoName = (terminoSearch.name) ? (terminoSearch.name).toUpperCase() : '';
                    log.debug({title: 'terminoName', details: terminoName});
                    
                    //Condiciones para llenar las condiciones de Pago.
                    if(terminoName.indexOf('DE 1 A 3') != -1){
                        objRecord.setCurrentSublistText({
                            sublistId: 'item',
                            fieldId: 'custcol_tkio_condiciones_pago',
                            text: 'El término de pago aplicar a partir de la recepción de la factura.'
                        });
                    }
                    else if(terminoName.indexOf('OBSERVACIONES') != -1){
                        objRecord.setCurrentSublistText({
                            sublistId: 'item',
                            fieldId: 'custcol_tkio_condiciones_pago',
                            text: 'El término de pago aplicará a partir de...(ver observaciones).'
                        });
                    }
                    else if(terminoName.indexOf('FECHA DE PAGO') != -1){
                        objRecord.setCurrentSublistText({
                            sublistId: 'item',
                            fieldId: 'custcol_tkio_condiciones_pago',
                            text: 'El término de pago aplicará a la próxima fecha de pago del proyecto o subsidiaria a partir de la recepción de la factura.'
                        });
                    }
                    else if(terminoName.indexOf('15') != -1 || terminoName.indexOf('30') != -1 || terminoName.indexOf('45') != -1 || terminoName.indexOf('60') != -1 || terminoName.indexOf('90') != -1 || terminoName.indexOf('120') != -1){
                        objRecord.setCurrentSublistText({
                            sublistId: 'item',
                            fieldId: 'custcol_tkio_condiciones_pago',
                            text: 'El término de pago aplicará a partir de la recepción de la factura y de acuerdo al calendario de pago del proyecto o subsidiaria.'
                        });
                    }
                    else{
                        objRecord.setCurrentSublistText({
                            sublistId: 'item',
                            fieldId: 'custcol_tkio_condiciones_pago',
                            text: ''
                        });
                    }
                }
            }
        }catch(e){
            log.error({title: 'fieldChanged: ', details: e});
        }

    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        
    };
    
});
