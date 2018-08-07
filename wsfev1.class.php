<?php
error_reporting(0);

class WSFEV1 {

	const LOG_XMLS = true;         
	const T_WSDL = "wsfev1.wsdl"; //homologacion 
	const TA 	= "xml/TA.xml";    # Ubicacion Ticket de Acceso
	const P_WSDL = "https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL"; //produccion
	const T_WSFEURL = "https://wswhomo.afip.gov.ar/wsfev1/service.asmx"; // homologacion
	const P_WSFEURL = "https://servicios1.afip.gov.ar/wsfev1/service.asmx"; // produccion

	public $path;
	public $WSDL;
	public $WSFEURL;
	public $database;
	public $condVta;
	public $CUIT;    # CUIT del emisor
	public $pathLogs;
	
	/*
	* manejo de errores
	*/
	public $error = '';
	public $ObsCode = '';
	public $ObsMsg = '';
	public $Code = '';
	public $Msg = '';

	// Cliente SOAP
	private $client;
  	private $TA;
  
	public function __construct($build, $path, $database, $condVta, $CUIT)
	{
		ini_set("soap.wsdl_cache_enabled", "0");    
		 
		$this->path = $path;
		$this->database = $database;
		$this->condVta = $condVta;
		$this->CUIT = (double) $CUIT;

		$this->pathLogs = $this->path."/"."resources/".$this->database."/log.txt";
		//Escribimos el comienzo del log
		file_put_contents($this->pathLogs, date("d/m/Y h:i:s") ." - Comienzo\n", FILE_APPEND | LOCK_EX);

	 	if($build === "test") {
			$this->WSDL = self::T_WSDL;
			$this->WSFEURL = self::T_WSFEURL;
		} else {
			$this->WSDL = self::P_WSDL;
			$this->WSFEURL = self::P_WSFEURL;
		}
    
		// validar archivos necesarios
		if($build === "test") {
			if (!file_exists($this->path.$this->WSDL)) $this->error .= " Failed to open ".$this->WSDL;
		}
		
		if(!empty($this->error)) {
			$err ='{
						"status":"err",
						"message":"WSFE class. Faltan archivos necesarios para el funcionamiento. '.$this->error.'"
					}';
			file_put_contents($this->pathLogs, date("d/m/Y h:i:s") ." - WSFE Err: ". $err."\n", FILE_APPEND | LOCK_EX);
		}        
		
		$options = 	array( 
						'soap_version' => SOAP_1_2,
						'location'     => $this->WSFEURL,
						'exceptions'   => 0,
						'trace'        => 1
					);
		
		file_put_contents($this->pathLogs, date("d/m/Y h:i:s") ." - WSFE Options Soap Client: ".json_encode($options)."\n", FILE_APPEND | LOCK_EX);

		$this->client = new SoapClient($this->WSDL, $options);
	}
  
	// Chequea errores
	private function _checkErrors($results, $method)
	{
		if (self::LOG_XMLS) {
			file_put_contents($this->path."resources/".$this->database."/xml/request-".$method.".xml",$this->client->__getLastRequest()."\n", FILE_APPEND | LOCK_EX);
			file_put_contents($this->path."resources/".$this->database."/xml/response-".$method.".xml",$this->client->__getLastResponse()."\n", FILE_APPEND | LOCK_EX);
		}
		
		if (is_soap_fault($results)) {
			$err ='{
						"status":"err",
						"message":"WSFE class. FaultString: ' . $results->faultcode.' '.$results->faultstring.'"
					}';

			file_put_contents($this->pathLogs, date("d/m/Y h:i:s") ." - WSFE is_soap_fault: ". $err."\n", FILE_APPEND | LOCK_EX);
		}
		
		if ($method == 'FEDummy') {return;}
		
		$XXX=$method.'Result';
		if ($results->$XXX->Errors->Err->Code != 0) {
			$this->error = "Method=$method errcode=".$results->$XXX->Errors->Err->Code." errmsg=".$results->$XXX->Errors->Err->Msg;
		}
			
		
		//asigna error a variable
		if ($method == 'FECAESolicitar') {
			if ($results->$XXX->FeDetResp->FECAEDetResponse->Observaciones->Obs->Code){	
				$this->ObsCode = $results->$XXX->FeDetResp->FECAEDetResponse->Observaciones->Obs->Code;
				$this->ObsMsg = $results->$XXX->FeDetResp->FECAEDetResponse->Observaciones->Obs->Msg;
			}
		}
		
		$this->Code = $results->$XXX->Errors->Err->Code;
		$this->Msg = $results->$XXX->Errors->Err->Msg;
		//fin asigna error a variable
		
		if($results->$XXX->Errors->Err->Code) {
			return $results->$XXX->Errors->Err->Code != 0 ? true : false;
		} else if ($results->$XXX->FeDetResp->FECAEDetResponse->Observaciones->Obs->Code) {
			return $results->$XXX->FeDetResp->FECAEDetResponse->Observaciones->Obs->Code != 0 ? true : false;
		} else {
			return false;
		}
	}

	
	//Abre TA
	public function openTA()
	{
		file_put_contents($this->pathLogs, date("d/m/Y h:i:s") ." - OPEN TA : ".$this->path."/resources/".$this->database.self::TA."\n", FILE_APPEND | LOCK_EX);
		$this->TA = simplexml_load_file($this->path."resources/".$this->database."/".self::TA);

		return $this->TA == false ? false : true;
	}
  
	//Funcion para solicitar ultimo comp autorizado

	public function FECompUltimoAutorizado($ptovta, $tipo_cbte)
	{
		$results = $this->client->FECompUltimoAutorizado(
			array('Auth'=>array('Token' => $this->TA->credentials->token,
								'Sign' => $this->TA->credentials->sign,
								'Cuit' => $this->CUIT),
				'PtoVta' => $ptovta,
				'CbteTipo' => $tipo_cbte));
		
		$e = $this->_checkErrors($results, 'FECompUltimoAutorizado');
		
		return $e == false ? $results->FECompUltimoAutorizadoResult->CbteNro : false;
	} //end function FECompUltimoAutorizado
  
	/*
	* Retorna el ultimo comprobante autorizado para el tipo de comprobante /cuit / punto de venta ingresado.
	*/ 
	public function recuperaLastCMP($ptovta, $tipo_cbte)
	{
		$results = $this->client->FERecuperaLastCMPRequest(
			array('argAuth' =>  array('Token' => $this->TA->credentials->token,
									'Sign' => $this->TA->credentials->sign,
									'cuit' => $this->CUIT),
				'argTCMP' => array('PtoVta' => $ptovta,
									'TipoCbte' => $tipo_cbte)));
		$e = $this->_checkErrors($results, 'FERecuperaLastCMPRequest');
		
		return $e == false ? $results->FERecuperaLastCMPRequestResult->cbte_nro : false;
	} //end function recuperaLastCMP

	
	/*
	* Solicitud CAE y fecha de vencimiento 
	*/	
	public function FECAESolicitar($cbte, $ptovta, $regfe, $regfeasoc, $regfetrib, $regfeiva)
	{
		if ($cbte == "0") { // para 
			$cbte = "1";
		}
		$params = array( 
			'Auth' => 
			array( 'Token' => $this->TA->credentials->token,
					'Sign' => $this->TA->credentials->sign,
					'Cuit' => $this->CUIT ), 
			'FeCAEReq' => 
			array( 'FeCabReq' => 
				array( 'CantReg' => 1,
						'PtoVta' => $ptovta,
						'CbteTipo' => $regfe['CbteTipo'] ),
			'FeDetReq' => 
			array( 'FECAEDetRequest' => 
				array( 'Concepto' => $regfe['Concepto'],
						'DocTipo' => $regfe['DocTipo'],
						'DocNro' => $regfe['DocNro'],
						'CbteDesde' => $cbte,
						'CbteHasta' => $cbte,
						'CbteFch' => $regfe['CbteFch'],
						'ImpNeto' => $regfe['ImpNeto'],
						'ImpTotConc' => $regfe['ImpTotConc'], 
						'ImpIVA' => $regfe['ImpIVA'],
						'ImpTrib' => $regfe['ImpTrib'],
						'ImpOpEx' => $regfe['ImpOpEx'],
						'ImpTotal' => $regfe['ImpTotal'], 
						'FchServDesde' => $regfe['FchServDesde'], //null
						'FchServHasta' => $regfe['FchServHasta'], //null
						'FchVtoPago' => $regfe['FchVtoPago'], //null
						'MonId' => $regfe['MonId'], //PES 
						'MonCotiz' => $regfe['MonCotiz'], //1 
						'Tributos' => 
							array( 'Tributo' => 
								array ( 'Id' =>  $regfetrib['Id'], 
										'Desc' => $regfetrib['Desc'],
										'BaseImp' => $regfetrib['BaseImp'], 
										'Alic' => $regfetrib['Alic'], 
										'Importe' => $regfetrib['Importe'] ),
								), 
						'Iva' => 
							array ( 'AlicIva' => 
								array ( 'Id' => $regfeiva['Id'], 
										'BaseImp' => $regfeiva['BaseImp'], 
										'Importe' => $regfeiva['Importe'] ),
							), 
						), 
				), 
			), 
		);

		if($this->$condVta == 6 || $regfeiva['Id'] === 0) {
			$params["FeCAEReq"]["FeDetReq"]["FECAEDetRequest"]["Iva"] = null;
		}

		file_put_contents($this->pathLogs, date("d/m/Y h:i:s") ." - WSFE FECAESolicitar ". json_encode($params)."\n", FILE_APPEND | LOCK_EX);
	
		$results = $this->client->FECAESolicitar($params);
		
		file_put_contents($this->pathLogs, date("d/m/Y h:i:s") ." - WSFE FECAESolicitar Result ". json_encode($results)."\n", FILE_APPEND | LOCK_EX);
		$e = $this->_checkErrors($results, 'FECAESolicitar');
		
		//asigno respuesta 
		$resp_cae = $results->FECAESolicitarResult->FeDetResp->FECAEDetResponse->CAE;
		$resp_caefvto = $results->FECAESolicitarResult->FeDetResp->FECAEDetResponse->CAEFchVto;
		
		return $e == false ? Array( 'cae' => $resp_cae, 'fecha_vencimiento' => $resp_caefvto ): false;
	} //end function FECAESolicitar
	
} // class

?>
