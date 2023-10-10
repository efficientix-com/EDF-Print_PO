/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/ui/serverWidget'], function(serverWidget) {

    function beforeLoad(context) {

        context.form.clientScriptModulePath = './actions_report.js';

        var button = context.form.addButton({
            id : 'custpage_createreport',
            label : 'Imprimir Orden de Compra',
            functionName: 'buscar_info'
        });
    }



    return {
        beforeLoad: beforeLoad,

    }
});
