<?php
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly
require_once(BPOST_PLUGIN_PATH.'/includes/admin/class-Bpost-order-ui.php');
include_once(BPOST_PLUGIN_PATH.'/includes/core/class-Bpost-api-v3.php');
include_once(BPOST_PLUGIN_PATH.'/includes/class-woo-Bpost-order.php');
include_once(BPOST_PLUGIN_PATH.'/includes/class-woo-Bpost.php');

/**
 * Allow for client specific Bpost credentials.
 * Set ui for client to add credentials on seller dashboard
 * 
 */
class BpostDokan extends BpostMarketplace
{

}