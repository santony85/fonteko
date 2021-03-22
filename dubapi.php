<?php
	
	//print_r($argv);
	
	$fd = $argv[1];
    $val = $argv[2];
	
	$params =array();
	
	
	if ($fd == "qr_code") {
      $params =array("qr_code"=>$val);
      } 
    else if ($fd =="nb_centime"){
      $params =array("nb_centime"=>$val);
      }
	//print_r($params);
	$apikey="B!fYdcjLC8kOKHSyq9";//$apikey="B!fYdcjLC8kOKHSyq9";
	//$params =["qr_code"=>"1832317363810753"];
    echo base64_encode(hash('sha256', $apikey.json_encode($params)));   
    
?>