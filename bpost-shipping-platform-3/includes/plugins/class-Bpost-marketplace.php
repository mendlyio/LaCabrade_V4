<?php
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/**
 * Parent class of all marketplaces  
 * Handle common stuff like getting a token or exporting orders 
 * This class should probably be 2, where we extract all order methods 
 * into a BpostMarketplaceOrder class that extends the woo order class, but with current  
 * functions that's more mess than profit 
 * 
 */ 
abstract class BpostMarketplace {

}