<?php
date_default_timezone_set('America/Buenos_Aires');

include('wsaa.class.php');
include('wsfev1.class.php');

//Escribimos el comienzo del log
file_put_contents("log.txt", date("d/m/Y h:i:s") ." - Comienzo\n", FILE_APPEND | LOCK_EX);

if(isset($_POST['config'])) {
	$config = json_decode($_POST['config'], true);
} else {
	if(empty($err)) {
		$err =	'{
					"status":"err",
					"message":"El CUIT informado no es correcto",
				}';
		file_put_contents("log.txt", date("d/m/Y h:i:s") ." - Err: ". $err."\n", FILE_APPEND | LOCK_EX);
		echo $err;
	}
}

//Escribimos log con config recibido
file_put_contents("log.txt", date("d/m/Y h:i:s") ." - Config: ".json_encode($config)."\n", FILE_APPEND | LOCK_EX);

if(isset($_POST['transaction'])) {
	$transaction = json_decode($_POST['transaction'], true);
} else {
	if(empty($err)) {
		$err =	'{
					"status":"err",
					"message":"Debe informar al mes un transacción",
				}';
		file_put_contents("log.txt", date("d/m/Y h:i:s") ." - Err: ". $err."\n", FILE_APPEND | LOCK_EX);
		echo $err;
	}
}

// Escribimos log con transacción recibida
file_put_contents("log.txt", date("d/m/Y h:i:s") ." - Transacción: ".json_encode($transaction)."\n", FILE_APPEND | LOCK_EX);

$err;

$database = $config["database"];

$wsaa = new WSAA($database);

// Compruebo fecha de exp y si la excede genero nuevo TA
$fecha_ahora = date("Y-m-d H-i-s");
$fecha_exp_TA = $wsaa->get_expiration();

if ($fecha_exp_TA < $fecha_ahora) {
	if ($wsaa->generar_TA()) {
		file_put_contents("log.txt", date("d/m/Y h:i:s") ."Genero nuevo TA, válido hasta: ". $wsaa->get_expiration() ."\n", FILE_APPEND | LOCK_EX);	
	} else {
		$err =	'{
						"status":"err",
						"message":"Error al obtener TA",
					}';
		file_put_contents("log.txt", date("d/m/Y h:i:s") ." - Err: ". $err."\n", FILE_APPEND | LOCK_EX);
		echo $err;
  }
} else {
	file_put_contents("log.txt", date("d/m/Y h:i:s") ." TA reutilizado, válido hasta: ". $wsaa->get_expiration() ."\n", FILE_APPEND | LOCK_EX);
}

$condVta = $config["vatCondition"];
$CUIT = $config["companyCUIT"];
$CUIT = explode("-", $CUIT)[0].explode("-", $CUIT)[1].explode("-", $CUIT)[2];


//Conecto Wsfev1
$wsfev1 = new WSFEV1();
$wsfev1->setConfig($database, $condVta, $CUIT);

// Carga el archivo TA.xml
$wsfev1->openTA();

$doctipo;
$docnumber;

if($transaction["company"]) {
	if( $transaction["company"]["DNI"] && $transaction["company"]["DNI"] !== '' ) {
		$doctipo = 96;
		$docnumber = (double) $transaction["company"]["DNI"];
	} else if( $transaction["company"]["CUIT"] && $transaction["company"]["CUIT"] !== '' ) {
		$doctipo = 80;
		$CUIT = explode("-", $transaction["company"]["CUIT"])[0].explode("-", $transaction["company"]["CUIT"])[1].explode("-", $transaction["company"]["CUIT"])[2];
		$docnumber = (double) $CUIT;
	} else {
		$doctipo = 99;
		$docnumber = 0;
	}
} else {
	$doctipo = 99;
	$docnumber = 0;
}

$tipcomp;
$x;

if(count($transaction["type"]["codes"]) > 0) {
	for ( $x = 0 ; $x < count($transaction["type"]["codes"]) ; $x ++ ) {
		if ($transaction["type"]["codes"][$x]["letter"] == $transaction["letter"]) {
			$tipcomp = $transaction["type"]["codes"][$x]["code"];
		}
	}
} else {
	if(empty($err)) {
		$err ='{
					"status":"err",
					"message":"El tipo de comprobante no tiene definidos los código AFIP"
				}';	
		file_put_contents("log.txt", date("d/m/Y h:i:s") ." - Err: FECompUltimoAutorizado no es numérico - ". $err."\n", FILE_APPEND | LOCK_EX);
		echo $err;
	}
}

$ptovta = $transaction["origin"]; //Punto de Venta SIN CEROS ADELANTE!!
$tipocbte = $tipcomp; // Factura A: 1 --- Factura B: 6 ---- Factura C: 11
$cbteFecha = date("Ymd");
file_put_contents("log.txt", date("d/m/Y h:i:s") ." - Fecha de comprobante - ". $cbteFecha."\n", FILE_APPEND | LOCK_EX);

$baseimp;
$impneto;
$impiva;

if($transaction["letter"] !== "C" && count($transaction["taxes"]) > 0) {
	for ( $y = 0 ; $y < count($transaction["taxes"]) ; $y ++) {
		$baseimp = $transaction["taxes"][$y]["percentage"];
		$impneto = $impneto + $transaction["taxes"][$y]["taxBase"];
		$impiva = $impiva + $transaction["taxes"][$y]["taxAmount"];
	}
} else {
	$baseimp = 0;
	$impiva = 0;
	$impneto = 0;
}

$regfe['CbteTipo']=$tipocbte;
$regfe['Concepto']=1; //Productos: 1 ---- Servicios: 2 ---- Prod y Serv: 3
$regfe['DocTipo']= $doctipo; //80=CUIT -- 96 DNI --- 99 general cons final
$regfe['DocNro']= $docnumber;  //0 para consumidor final / importe menor a $1000
$regfe['CbteFch']=$cbteFecha; 	// fecha emision de factura
$regfe['ImpNeto']= $impneto;			// Imp Neto
$regfe['ImpTotConc']=$transaction["exempt"];			// no gravado
$regfe['ImpIVA']= $impiva;			// IVA liquidado
$regfe['ImpTrib']=0;			// otros tributos
$regfe['ImpOpEx']=0;			// operacion exentas
$regfe['ImpTotal']=$transaction["totalPrice"];			// total de la factura. ImpNeto + ImpTotConc + ImpIVA + ImpTrib + ImpOpEx
$regfe['FchServDesde']=null;	// solo concepto 2 o 3
$regfe['FchServHasta']=null;	// solo concepto 2 o 3
$regfe['FchVtoPago']=null;		// solo concepto 2 o 3
$regfe['MonId']='PES'; 			// Id de moneda 'PES'
$regfe['MonCotiz']=1;			// Cotizacion moneda. Solo exportacion

// Comprobantes asociados (solo notas de crédito y débito):
$regfeasoc['Tipo'] = 91; //91; //tipo 91|5			
$regfeasoc['PtoVta'] = 1;
$regfeasoc['Nro'] = 1;

// Detalle de otros tributos
$regfetrib['Id'] = 1; 			
$regfetrib['Desc'] = '';
$regfetrib['BaseImp'] = 0;
$regfetrib['Alic'] = 0; 
$regfetrib['Importe'] = 0;

$regfeiva;

if($baseimp !== 0) {
	$regfeiva['Id'] = 5; 
	$regfeiva['BaseImp'] = $impneto; 
	$regfeiva['Importe'] = $impiva;
} else {
	$regfeiva['Id'] = 0; 
	$regfeiva['BaseImp'] = 0; 
	$regfeiva['Importe'] = 0;
}

//Pido ultimo numero autorizado
$nro = $wsfev1->FECompUltimoAutorizado($ptovta, $tipocbte);

if(!is_numeric($nro)) {
	$nro=0;
	$nro1 = 0;
	if(!isNan($wsfev1->Code)) {
		$wsfev1->Code = 0;
	}
	if(empty($err)) {
		$err ='{
					"status":"err",
					"code":'.$wsfev1->Code.',
					"message":"'.$wsfev1->Msg.'",
					"observationCode":"'.$wsfev1->ObsCod.'",
					"observationMessage":"'.$wsfev1->ObsMsg.'"
				}';	
		file_put_contents("log.txt", date("d/m/Y h:i:s") ." - Err: FECompUltimoAutorizado no es numérico - ". $err."\n", FILE_APPEND | LOCK_EX);
		echo $err;
	}
} else {
	file_put_contents("log.txt", date("d/m/Y h:i:s") ." - Ultimo número de comprobante autorizado - ".$nro."\n", FILE_APPEND | LOCK_EX);
	$nro1 = $nro + 1;
	$cae = $wsfev1->FECAESolicitar($nro1, // ultimo numero de comprobante autorizado mas uno 
                $ptovta,  // el punto de venta
                $regfe, // los datos a facturar
				$regfeasoc,
				$regfetrib,
				$regfeiva	
	 );
	 
	$caenum = $cae['cae']; 
	$caefvt = $cae['fecha_vencimiento'];
	$numero = $nro+1;    
	file_put_contents("log.txt", date("d/m/Y h:i:s") ." - CAE obtenido - ".$caenum."\n", FILE_APPEND | LOCK_EX);
	file_put_contents("log.txt", date("d/m/Y h:i:s") ." - Fecha Vencimiento de CAE - ".$caefvt."\n", FILE_APPEND | LOCK_EX);
	file_put_contents("log.txt", date("d/m/Y h:i:s") ." - Response - ".json_encode($wsfev1)."\n", FILE_APPEND | LOCK_EX);
	if ($caenum != "") {
		
		$CAEExpirationDate = str_split($caefvt, 2)[3]."/".str_split($caefvt, 2)[2]."/".str_split($caefvt, 4)[0]." 00:00:00";
		
		$result ='{
			"status":"OK",
			"number":'.$numero.',
			"CAE":"'.$caenum.'",
			"CAEExpirationDate":"'.$CAEExpirationDate.'"
		}';
		file_put_contents("log.txt", date("d/m/Y h:i:s") ." - Response - ".$result."\n", FILE_APPEND | LOCK_EX);
		echo $result;
	} else {
		if(empty($err)) {
			$err ='{
				"status":"err",
				"code":"'.$wsfev1->Code.'",
				"message":"'.$wsfev1->Msg.'",
				"observationCode":"'.$wsfev1->ObsCod.'",
				"observationMessage":"'.$wsfev1->ObsMsg.'",
				"observationCode2":"'.$wsfev1->ObsCode2.'",
				"observationMessage2":"'.$wsfev1->ObsMsg2.'"
			}';
			file_put_contents("log.txt", date("d/m/Y h:i:s") ." - Response - ".$err."\n", FILE_APPEND | LOCK_EX);
			echo $err;
		}
	}
}