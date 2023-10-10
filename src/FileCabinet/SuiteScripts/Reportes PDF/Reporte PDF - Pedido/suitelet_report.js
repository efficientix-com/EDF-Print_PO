/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */

 define(['N/record', 'N/search', 'N/render', 'N/file', 'N/xml', 'N/format/i18n'], function (record, search, render, file, xml, format) {

    function onRequest(context) {
        try {
            var response = context.response;
            var id = JSON.parse(context.request.parameters.value);
            var render_pdf = render.create();
            var datosJson;

            var records = record.load({
                type: record.Type.PURCHASE_ORDER,
                id: id,
                isDynamic: true,
            });
            var formato_pdf = records.getValue('custbody_tkio_form_clausu_impres');
            log.audit("formato_pdf", formato_pdf);
            // pdfID SB = 165 || PROD = 148
            var pdfId = 165;
            datosJson = buildDataPDF_default(context, records);
            log.audit({ title: "datosJason", details: datosJson });

            render_pdf.setTemplateById(pdfId);
            var transactionFile = null;
            render_pdf.addCustomDataSource({ format: render.DataSource.OBJECT, alias: "RECORD_PDF", data: datosJson });
            transactionFile = render_pdf.renderAsPdf();
            response.writeFile({
                file: transactionFile,
                isInline: true
            });
        } catch (e) {
            log.error("ERROR", e);
            response.write("INFO: Ha ocurrido un error al intentar crear la plantilla");
            return;
        }
    }

    function buildDataPDF_default(context, records) {
        try {
            var id = JSON.parse(context.request.parameters.value);
            log.audit({ title: 'url:', details: id });

            //obtener datos de la orden de compra
            var counts = records.getLineCount({
                sublistId: 'item'
            });
            var proveedor = records.getValue('entity');
            var subsidiaria = records.getValue('subsidiary');
            var total = records.getValue('total');
            var subtotal = records.getValue('subtotal');
            var taxtotal = records.getValue('taxtotal');
            var currency = records.getText('currency');
            var employee = records.getValue('employee');
            var ubicacion_ped = records.getValue('location');
            var printLabel = records.getValue('custbody_tko_print_label');
            var numero_pedSearch = records.getValue('id');
            var creadorName = '';

            var folio_servicios = records.getValue('custbody_tkio_serv_registrados');
            var serviciosEspecializados = records.getValue('custbody_tkio_serv_esp_reg');
            var numTrabajadores = records.getValue("custbody_tkio_num_trabajadores");

            var totales_format = format.getCurrencyFormatter({ currency: currency });
            var totales_symbol = totales_format.symbol;
            totales_format = totales_format.numberFormatter;

            // ---------------------------------------------------------------------------------------------------
            var purchaserequisitionSearchObj = search.create({
                type: "purchaserequisition",
                filters:
                    [
                        ["type", "anyof", "PurchReq"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "internalid", label: "ID interno" }),
                        search.createColumn({ name: "applyingtransaction", label: "Aplicación de transacción" })
                    ]
            });
            var myPagedResults = purchaserequisitionSearchObj.runPaged({
                pageSize: 1000
            });
            var thePageRanges = myPagedResults.pageRanges;
            var idsolped, numeroPedido, bandera = false;
            for (var i in thePageRanges) {
                var thepageData = myPagedResults.fetch({
                    index: thePageRanges[i].index
                });
                thepageData.data.forEach(function (result) {
                    if (bandera == false) {
                        numeroPedido = result.getValue({ name: 'applyingtransaction' });
                        if (numeroPedido == numero_pedSearch) {
                            idsolped = result.getValue({ name: 'internalid' });
                            log.audit({ title: 'Relacion Pedido-solped', details: { pedido: numeroPedido, solped: idsolped } });
                            bandera = true;
                        }
                        return true;
                    } else {
                        return false;
                    }
                });
                if (bandera == true) {
                    break;
                }
            }
            if (idsolped) {
                var nameOrigen = search.lookupFields({
                    type: 'purchaserequisition',
                    id: idsolped,
                    columns: ['entity']
                });
                creadorName = nameOrigen.entity[0].text;
                log.audit({ title: 'CreadorName', details: creadorName });
            }
            // ---------------------------------------------------------------------------------------------------


            if (ubicacion_ped) {
                var records_location = record.load({
                    type: record.Type.LOCATION,
                    id: ubicacion_ped,
                    isDYnamic: true,
                });
                var direccion_location = records_location.getValue('mainaddress_text') || '';
                log.audit("Location en el if", direccion_location);
            } else {
                var direccion_location = '';
                log.audit("Location en el else", direccion_location);
            }
            var iniciales_comprador = ""
            if (employee) {
                var records_employee = record.load({
                    type: record.Type.EMPLOYEE,
                    id: employee,
                    isDynamic: true,
                });

                var firstname = records_employee.getValue('firstname');
                var secondlame = records_employee.getValue('lastname');
                var initals = records_employee.getValue('initials');
                var emailEmployee = records_employee.getValue({ fieldId: 'email' });

                var nombre_empleado = firstname + ' ' + secondlame;
                iniciales_comprador = initals

            } else {
                var nombre_empleado = '';
            }

            //Buscar datos del proveedor
            var proveedor_

            //buscar datos de subsidiaria
            var subsidiary_record = record.load({
                type: record.Type.SUBSIDIARY,
                id: subsidiaria,
                isDynamic: true,
            });

            var subsidiary_rfc = subsidiary_record.getValue('federalidnumber');
            var subsidiary_adress = subsidiary_record.getValue('mainaddress_text');
            var subsidiary_phone = subsidiary_record.getValue('phone') || '5482 5260';
            var subsidiary_name = subsidiary_record.getValue('legalname');
            var subsidiary_logo_url = subsidiary_record.getValue('logo');
            if (subsidiary_logo_url) {
                var file_logo = file.load({ id: subsidiary_logo_url });
                var subsidiary_logo = file_logo.url;
            } else {
                var subsidiary_logo = '';
            }

            //obtener datos de la solicitud de compra
            var solped = records.getSublistValue({
                sublistId: 'item',
                fieldId: 'linkedorder',
                line: 0
            });
            log.audit({ title: 'solped', details: solped });
            var empleado = '';
            if (solped[0]) {
                log.audit({ title: 'enter', details: 'entró' });
                var solicitud = record.load({
                    type: record.Type.PURCHASE_REQUISITION,
                    id: solped[0],
                    isDynamic: true,
                });
                var solicitante = solicitud.getValue('entity');
                //obtener datos del solicitante
                empleado = record.load({
                    type: record.Type.EMPLOYEE,
                    id: solicitante,
                    isDynamic: true,
                });
            }
            //obtener datos del contacto del proveedor
            var contactos = search.create({
                type: search.Type.CONTACT,
                filters: [['company', search.Operator.IS, proveedor]
                    , 'and',
                ['role', search.Operator.IS, '-10']],
                columns: [
                    search.createColumn({ name: 'email' }),
                    search.createColumn({ name: 'firstname' })
                ]
            });
            var ejecutar = contactos.run();
            var resultado = ejecutar.getRange(0, 100);
            log.audit({ title: 'rol: ', details: resultado });
            //Obtener datos del proveedor
            var proveedor_data = record.load({
                type: record.Type.VENDOR,
                id: proveedor,
                isDynamic: true
            });

            var texto_a = '';
            var texto_b = '';
            var texto_c = '';
            var nombre_proveedor = '';
            var isperson = proveedor_data.getValue('isperson');
            var numStps = proveedor_data.getValue('custentity_tkio_num_reg_padron_stps')


            if (isperson == 'T') {
                var firstnameProv = proveedor_data.getValue('firstname');
                var secondlameProv = proveedor_data.getValue('lastname');
                var nombre_proveedor = firstnameProv + ' ' + secondlameProv;

                // nombre_proveedor = proveedor_data.getValue('glommedname');
                // texto_a = ' Que es una persona física con actividad empresarial.';
                // texto_b = ' Que goza de capacidad suficiente para celebrar la presente OC.';
                texto_a = ' Que es una Persona Física.';
                texto_b = ' Que su régimen fiscal es actividad empresarial y profesional.';
                texto_c = ' Que goza de capacidad suficiente para celebrar la presente OC.'

            }

            if (isperson == 'F') {
                nombre_proveedor = proveedor_data.getValue('companyname');
                // texto_a = ' Que su representada es una sociedad mercantil legalmente constituida de conformidad con las leyes de la República Mexicana.';
                // texto_b = ' Que su Representante Legal tiene las facultades legales para celebrar la presente OC, y para obligar a su representada en el cumplimiento de las condiciones que el se estipulan.';
                texto_a = 'Que su representada es una sociedad mercantil legalmente constituida de conformidad con las leyes de la República Mexicana.'
                texto_b = 'Que tiene un régimen fiscal Ley General de Personas Morales. ';
                texto_c = 'Que su Representante Legal tiene las facultades legales para celebrar la presente OC, y para obligar a su representada en el cumplimiento de las condiciones que el se estipulan.'
            }
            log.audit({ title: 'nombre_proveedor:', details: nombre_proveedor });
            //obtener datos de los hitos de pago
            var hitos = search.create({
                type: 'customrecord_csc_hito_pago',
                filters: [['custrecord_csc_transaccion', search.Operator.IS, id]],
                columns: [
                    search.createColumn({ name: 'custrecord_csc_descripcion_hito' }),
                    search.createColumn({ name: 'custrecord_csc_importe' }),
                    search.createColumn({ name: 'custrecord_csc_termino_pago' })
                ]
            });
            var ejecutar_hitos = hitos.run();
            var resultado_hitos = ejecutar_hitos.getRange(0, 100);

            //Obtener fechas
            var fecha_emision = new Date();
            fecha_emision = records.getValue('trandate');
            if (fecha_emision) {
                var date_emision = fecha_emision.getDate() + '/' + (fecha_emision.getMonth() + 1) + '/' + fecha_emision.getFullYear();
            } else {
                var date_emision = fecha_emision;
            }


            var fecha_entrega = records.getValue('duedate');
            if (fecha_entrega) {
                var date_entrega = fecha_entrega.getDate() + '/' + fecha_entrega.getMonth() + '/' + fecha_entrega.getFullYear();
            } else {
                var date_entrega = fecha_entrega;
            }

            var datosNotasSistema = getDataNotasSistema(id);

            var fecha_aprobacion_finanzas = ""
            var iniciales_aprobador_finanzas = ""
            var fecha_aprobacion_presupuesto = ""
            var iniciales_aprobador_presupuesto = ""
            var banderapresupuesto = false;
            var banderafinanzas = false;
            if (datosNotasSistema.success) {
                log.audit({ title: 'datosNotasSistema.notas', details: datosNotasSistema.notas });
                log.audit({ title: 'datosNotasSistema.notas.length', details: datosNotasSistema.notas.length });
                var contadorNotas = datosNotasSistema.notas.length
                for (var i = 0; i < contadorNotas; i++) {
                    if (datosNotasSistema.notas[i].campo == "custbody_efx_aprob_presupuesto" && datosNotasSistema.notas[i].valor == "T" && banderapresupuesto == false) //si finanzas aprobo
                    {
                        banderapresupuesto = true;
                        fecha_aprobacion_finanzas = (datosNotasSistema.notas[i].fecha)
                        fecha_aprobacion_finanzas = fecha_aprobacion_finanzas.split(' ');
                        fecha_aprobacion_finanzas = fecha_aprobacion_finanzas[0];
                        iniciales_aprobador_finanzas = datosNotasSistema.notas[i].inicialesEmpleado
                    }
                    if (datosNotasSistema.notas[i].campo == "custbody_efx_aprob_fin" && datosNotasSistema.notas[i].valor == "T" && banderafinanzas == false) {
                        banderafinanzas = true;
                        fecha_aprobacion_presupuesto = (datosNotasSistema.notas[i].fecha);
                        fecha_aprobacion_presupuesto = fecha_aprobacion_presupuesto.split(' ');
                        fecha_aprobacion_presupuesto = fecha_aprobacion_presupuesto[0];
                        iniciales_aprobador_presupuesto = datosNotasSistema.notas[i].inicialesEmpleado
                    }
                }
            } else {

            }

            var datosJson = new Object();
            log.audit({ title: 'fecha_aprobacion_presupuesto', details: fecha_aprobacion_presupuesto });
            log.audit({ title: 'fecha_aprobacion_finanzas', details: fecha_aprobacion_finanzas });
            log.audit({ title: 'iniciales_aprobador_presupuesto', details: iniciales_aprobador_presupuesto });
            log.audit({ title: 'iniciales_aprobador_finanzas', details: iniciales_aprobador_finanzas });
            //////////////////////////  INICIO DATOS FLUJO DE APROBACION//////////////////// Primero es presupuesto y al final finanzas
            datosJson.fecha_aprobacion_presupuesto = fecha_aprobacion_presupuesto;        //FECHAS
            datosJson.fecha_aprobacion_finanzas = fecha_aprobacion_finanzas;           //FECHAS

            datosJson.iniciales_aprobador_presupuesto = iniciales_aprobador_presupuesto;     //INICIALES
            datosJson.iniciales_aprobador_finanzas = iniciales_aprobador_finanzas;        //INICIALES
            //////////////////////////  FIN DATOS FLUJO DE APROBACION   ////////////////////7

            datosJson.id = id;
            datosJson.vendor_email = records.getValue('custbody_nsts_vp_vendor_email') || '';
            datosJson.fecha_emision = date_emision;
            datosJson.fecha_entrega = date_entrega;
            datosJson.num_pedido = records.getValue('tranid') || '';
            datosJson.memo = records.getValue('memo') || '';
            datosJson.razon_social = nombre_proveedor || '';
            datosJson.billadress = records.getValue('billaddress') || '';
            datosJson.direccion_entrega = records.getValue('custbody_csc_direccionentregadif') || '';
            datosJson.rep_legal_subsidiary = records.getValue('custbody_efx_replegal_subsidiary') || '';
            datosJson.rep_legal_vendor = proveedor_data.getValue('custentity_efx_replegal') || '';
            datosJson.texto_a = texto_a;
            datosJson.texto_b = texto_b;
            datosJson.texto_c = texto_c;
            datosJson.comprador = nombre_empleado;
            datosJson.comprador_iniciales = iniciales_comprador;
            datosJson.creadorName = creadorName;
            datosJson.clausulado = records.getValue({ fieldId: 'custbody_tkio_form_clausu_impres' }) || '';
            datosJson.metodo_pago = records.getText('custbody_ix_ge_metod_pago') || '';

            if (datosJson.direccion_entrega == '') {
                datosJson.direccion_entrega = direccion_location || '';
            }

            datosJson.terminos = records.getText('terms');
            datosJson.incoterm = records.getText('incoterm') || 'N/A';
            if (solped[0]) {
                datosJson.email_solicitante = empleado.getValue('email') || '';
                datosJson.rep_legal = empleado.getValue('custentity_efx_replegal') || '';
            } else {
                datosJson.email_solicitante = emailEmployee || nombre_empleado;
            }
            log.audit({ title: 'result email_contacto_principal', details: resultado });
            if (resultado[0]) {
                datosJson.email_contacto_principal = resultado[0].getValue({ name: 'email' }) || '';
                //datosJson.rep_legal = resultado[0].getValue({name: 'firstname'}) || '';
            } else {
                datosJson.email_contacto_principal = '';
            }
            var claveElector = proveedor_data.getValue("custentity_tkio_clave_elector");
            // datosJson.email_contacto_principal = proveedor_data.getValue('email') || '';

            datosJson.mail_vendor = proveedor_data.getValue('email') || '';
            datosJson.telefono_vendor = proveedor_data.getValue('phone') || '';
            datosJson.rfc_vendor = proveedor_data.getValue('vatregnumber') || '';
            datosJson.subsidiaria = subsidiary_name;
            datosJson.subsidiaria_adress = subsidiary_adress;
            datosJson.subsidiaria_rfc = subsidiary_rfc;
            datosJson.subsidiaria_phone = subsidiary_phone;
            datosJson.subsidiaria_logo = subsidiary_logo;
            datosJson.proveedor = proveedor;
            datosJson.empleado = employee;
            datosJson.total = totales_symbol + totales_format.format({ number: total });
            datosJson.subtotal = totales_symbol + totales_format.format({ number: subtotal });
            datosJson.taxtotal = totales_symbol + totales_format.format({ number: taxtotal });
            datosJson.currency = currency;
            datosJson.linkedorder = solped;
            datosJson.printlabel = printLabel ? 'T' : 'F';

            datosJson.folioServicios = folio_servicios;
            datosJson.serviciosEspecializados = serviciosEspecializados;
            datosJson.claveElector = claveElector;
            datosJson.numTrabajadores = numTrabajadores;
            datosJson.numStps = numStps;

            // datosJson.regimenFiscal = records.getValue('custbody_tkio_regimen_fiscal_trans');
            var regimenId = records.getValue('custbody_tkio_regimen_fiscal_trans');
            var regimen = '';
            if(regimenId){
                regimen = search.lookupFields({
                    type: "customrecord_mx_sat_industry_type",
                    id: regimenId,
                    columns: ['custrecord_mx_sat_it_code']
                });
            }
            datosJson.regimenFiscal = (regimen.custrecord_mx_sat_it_code) ? regimen.custrecord_mx_sat_it_code : '';
            datosJson.observaciones = records.getValue('custbody_tkio_observaciones'); 

            var jsonGlobal = JSON.parse(records.getValue('custbody_efx_fe_tax_json')); 
            log.debug({title: 'jsonGlobal', details: jsonGlobal});

            var tasa_16 = '0.00';
            var ret_iva = '0.00';
            var ret_isr = '0.00';
            var ret_iva23 = "0.00";
            var arrKeys = [];

            for (let clave in (jsonGlobal.rates_retencion_data)) {          
                if(clave==="16"){
                    ret_iva = jsonGlobal.rates_retencion_data[clave];
                }
                if(clave==="10"){
                    ret_isr = jsonGlobal.rates_retencion_data[clave]
                }
            }
            
            if(Object.keys(jsonGlobal.rates_iva_data).length !==0){
                tasa_16 = jsonGlobal.rates_iva_data[16];
            }
            
            var taxGlobal = {};
            taxGlobal.retIva = ret_iva;
            taxGlobal.retIsr = ret_isr;
            taxGlobal.retIva23 = ret_iva23; 
            taxGlobal.tasa = tasa_16;
            log.debug({title: 'taxGlobal', details: taxGlobal});  
            datosJson.impuestosGb = taxGlobal;

            datosJson.items = [];
            datosJson.hitos = [];

            var objItem = {};
            // objItem.index = '<b style="color:#001a70;font-size: 8pt;">N°</b>';
            // objItem.item_name = printLabel ? 'DESCRIPCIÓN DE LOS SERVICIOS ESPECIALIZADOS U OBRAS ESPECIALIZADAS' : 'DESCRIPCIÓN DE BIENES Y SERVICIOS';
            // objItem.mpn = '<b style="color:#001a70;font-size: 8pt;">NUMERO DE PARTE</b>';
            // objItem.quantity = '<b style="color:#001a70;font-size: 8pt;">CANTIDAD</b>';
            // objItem.units = '<b style="color:#001a70;font-size: 8pt;">UNIDAD DE MEDIDA</b>';
            // objItem.expecteddate = '<b style="color:#001a70;font-size: 8pt;">FECHA DE ENTREGA</b>';
            // objItem.rate = '<b style="color:#001a70;font-size: 8pt;">PRECIO UNITARIO</b>';
            // objItem.amount = '<b style="color:#001a70;font-size: 8pt;">IMPORTE</b>';

            // objItem.impuestos = '<b style="color:#001a70;font-size: 8pt;">IMPUESTOS</b>';
            // objItem.infoFacturacion = '<b style="color:#001a70;font-size: 8pt;">INFORMACIÓN DE FACTURACIÓN</b>';
            // objItem.condicionesPago = '<b style="color:#001a70;font-size: 8pt;">CONDICIONES DE PAGO</b>';

            // datosJson.items.push(objItem);

            for (var i = 0; i < counts; i++) {

                objItem = {};
                objItem.index = i + 1;

                objItem.item = records.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
                objItem.item_name = records.getSublistText({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });

                try {
                    var item_mpn = record.load({
                        type: record.Type.INVENTORY_ITEM,
                        id: objItem.item,
                        isDynamic: true,
                    });

                    objItem.mpn = item_mpn.getValue('mpn');

                }

                catch (err) {
                    objItem.mpn = '';
                }

                if (!objItem.mpn) {
                    objItem.mpn = '';
                }

                objItem.description = records.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'description',
                    line: i
                });

                objItem.units = records.getSublistText({
                    sublistId: 'item',
                    fieldId: 'units',
                    line: i
                });

                fecha_esperada = records.getSublistText({
                    sublistId: 'item',
                    fieldId: 'expectedreceiptdate',
                    line: i
                });
                
                var fecha_expected = new Date();  
                if (fecha_emision) {
                    objItem.expecteddate = fecha_expected.getDate() + '/' + (fecha_expected.getMonth() + 1) + '/' + fecha_expected.getFullYear();
                } else {
                    objItem.expecteddate = fecha_expected;
                }

                objItem.quantity = records.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: i
                });
                var item_rate = records.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    line: i
                });

                //========== INFO NUEVA DEL DRD =======================
                var impuestos = records.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_efx_fe_tax_json',
                    line: i
                });
                var objImp = JSON.parse(impuestos);
                log.debug({title: 'objImp', details: objImp});
        
                var objImpuestos = {
                        IVA: (objImp.iva.importe) ? (objImp.iva.importe) : "0.00" ,
                        RET_IVA: ((objImp.retenciones.rate)=='16') ? objImp.retenciones.importe : "0.00",
                        RET_ISR: ((objImp.retenciones.rate)) =='10'? objImp.retenciones.importe : "0.00",
                        RE_IVA_23: ((objImp.retenciones.name).indexOf("iva_2_3")!=-1) ? objImp.retenciones.importe : "0.00"
                };
                
                objItem.impuestos = objImpuestos;

                var terminos = records.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_tkio_term_pago',
                    line: i
                });
                log.debug({title: 'terminos: ', details: terminos});
                
                var terminoName = '';
                if(terminos){
                    terminoName = search.lookupFields({
                        type: 'term',
                        id: terminos,
                        columns: ['name']
                    });
                }

                var forma = records.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_tkio_forma_de_pago_display',
                    line: i
                });

                var cfdi = records.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_tkio_uso_cfdi_art_display',
                    line: i
                });

                var objInfoFacturacion = {
                    terminos : (terminoName.name) ? (terminoName.name) : '' ,
                    formaPago : forma,
                    cfdi : cfdi
                }
                objItem.infoFact = objInfoFacturacion;

                objItem.condicionesPago = records.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_tkio_condiciones_pago',
                    line: i
                });

                var format_rate = format.getCurrencyFormatter({ currency: currency });
                var symbol_rate = format_rate.symbol;
                format_rate = format_rate.numberFormatter;

                objItem.rate = symbol_rate + format_rate.format({ number: item_rate });

                var item_amount = records.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    line: i
                });

                var format_amount = format.getCurrencyFormatter({ currency: currency });
                var symbol_amount = format_amount.symbol;
                format_amount = format_amount.numberFormatter;
                objItem.amount = symbol_amount + format_amount.format({ number: item_amount });

                datosJson.items.push(objItem);
            }


            //llenar hitos de facturacion
            log.audit({ title: 'resultado_hitos', details: resultado_hitos });
            if (resultado_hitos.length > 0) {
                var objHitos = {};
                objHitos.linea = 0;
                objHitos.descripcion_hito = '<b style="color:#001a70">Descripción del Hito</b>';
                objHitos.importe_hito = '<b style="color:#001a70">Importe</b>';
                objHitos.terminos_hito = '<b style="color:#001a70">Terminos</b>';
                datosJson.hitos.push(objHitos);

                var format_amount_hito = format.getCurrencyFormatter({ currency: currency });
                var symbol_amount_hito = format_amount_hito.symbol;
                format_amount_hito = format_amount_hito.numberFormatter;
                var hito_amount = '';

                for (var x = 0; x < resultado_hitos.length; x++) {
                    var objHitos = {};

                    objHitos.descripcion_hito = resultado_hitos[x].getValue({ name: 'custrecord_csc_descripcion_hito' });
                    hito_amount = parseFloat(resultado_hitos[x].getValue({ name: 'custrecord_csc_importe' }));
                    objHitos.importe_hito = symbol_amount_hito + format_amount_hito.format({ number: hito_amount });
                    objHitos.terminos_hito = resultado_hitos[x].getText({ name: 'custrecord_csc_termino_pago' });
                    datosJson.hitos.push(objHitos);
                }
            }
            return datosJson;
        } catch (e) {
            log.error("buildDataPDF_default Error", e);
        }
    }

    function getDataNotasSistema(id_transaccion) {
        try {
            var responseSearch = {}
            var purchaseorderSearchObj = search.create({
                type: "purchaseorder",
                filters:
                    [
                        ["type", "anyof", "PurchOrd"],
                        "AND",
                        ["mainline", "is", "T"],
                        "AND",
                        ["internalid", "anyof", id_transaccion]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "recordtype",
                            join: "systemNotes",
                            label: "Tipo de registro"
                        }),
                        search.createColumn({
                            name: "field",
                            join: "systemNotes",
                            label: "Campo"
                        }),
                        search.createColumn({
                            name: "newvalue",
                            join: "systemNotes",
                            label: "Nuevo valor"
                        }),

                        search.createColumn({//Ordenado por fecha descendente
                            name: "date",
                            join: "systemNotes",
                            sort: search.Sort.DESC,
                            label: "Fecha"
                        }),
                        search.createColumn({
                            name: "name",
                            join: "systemNotes",
                            label: "Definido por"
                        })
                    ]
            });
            var searchResultCount = purchaseorderSearchObj.runPaged().count;
            log.audit("purchaseorderSearchObj result count", searchResultCount);
            if (searchResultCount) {
                var objetoDatos = []
                purchaseorderSearchObj.run().each(function (result) {
                    var ObjPedidoNotes = {}
                    var campo = result.getValue({ name: "field", join: "systemNotes" });
                    var valor = result.getValue({ name: "newvalue", join: "systemNotes" });
                    var fecha = result.getValue({ name: "date", join: "systemNotes" });
                    var id_empleado = result.getValue({ name: "name", join: "systemNotes" });
                    if (campo == "custbody_efx_aprob_fin" || campo == "custbody_efx_aprob_presupuesto") {
                        ObjPedidoNotes.campo = campo
                        ObjPedidoNotes.valor = valor
                        ObjPedidoNotes.fecha = fecha
                        //ObjPedidoNotes.id_empleado=id_empleado
                        var inicialesEmpleado = _getDataEmpleado(id_empleado)
                        ObjPedidoNotes.inicialesEmpleado = inicialesEmpleado
                        objetoDatos.push(ObjPedidoNotes);
                    }
                    return true;
                });
                responseSearch = {
                    notas: objetoDatos,
                    success: true,
                }
            } else {
                responseSearch = {
                    success: false
                }
            }


            return responseSearch;

        } catch (e) {
            log.error("ERROR getDataNotasSistema", e);
        }
    }

    function _getDataEmpleado(idEmpleado) {
        try {
            var employeeObj = record.load({
                type: record.Type.EMPLOYEE,
                id: idEmpleado
            });

            var inciales = employeeObj.getValue({ fieldId: 'initials' });
            log.audit({ title: 'inciales', details: inciales });
            return inciales
        } catch (e) {
            log.error("ERROR getDataEmpleado", e);
        }
    }

    return {
        onRequest: onRequest
    }
});