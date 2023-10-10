/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/currentRecord','N/url'], function(currentRecord, url) {

    function buscar_info(context){
       
        var records = currentRecord.get();
        console.log(records);
        var id = records.getValue('id');

        var scriptUrl = url.resolveScript({
            scriptId:'customscript_csc_suitelet_report',
            deploymentId:'customdeploy_csc_suitelet_report',
            params:{
                value: id
            }
        });
        if(id){

            window.open(scriptUrl, '_blank');
        }
        
       
    }

    function pageInit(context) {
        
    }


    return {
        buscar_info:buscar_info,
        pageInit: pageInit,

    }
});
