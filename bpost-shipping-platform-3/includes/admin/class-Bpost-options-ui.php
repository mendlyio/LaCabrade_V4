<?php
//TODO: this should be included in the main class
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly
include_once (BPOST_PLUGIN_PATH.'/includes/core/class-Bpost-api-v3.php');
/**
 * The options page
 *
 * @package Bpost.admin
 * @since 1.0.0
 *
 */
abstract class BpostOptionsUI {
    /**
     * @param string public_key - a key used to get data from the api
     */
    protected $public_key;

    /**
     * @param String private_key - a key used to encript data from the api
     */
    protected $private_key;

    /**
     * @param String token - a temporary key used to get data from the api
     */
    protected $token;

    /**
     * @param String token_expires - the date when this token will expire
     */
    protected $token_expires;

    /**
     * @param boolean $test - if the data we send to the api is meant to be saved or just test
     */
    protected $test;

    /**
     * @param String maps_key - if set we serve a gmaps else we serve an openmap
     */
    protected $maps_key;

    /**
     * @param int autoexport_status - what status should we auto export
     */
    protected $autoexport_status;

    /**
     * BpostApi $api
     */
    protected $api = null;

    protected $marketplace;

    protected $hidenotfree;

    protected $CallbackUrl;

    protected $is_api_active;

    protected $usewpapi;

    protected $carriers;

    /***
     * Exclude virtual products
     */
    protected $exclude_virtual_products = 1;

    /**
     * Exclude virtual orders
     * */
    protected $exclude_virtual_orders = 1;



    public function __construct() {
        $this->actions();
    }

    public function actions(){
        add_action( 'admin_menu', array( $this, 'add_plugin_page' ) );
        add_action( 'admin_init', array( $this, 'page_init' ) );
    }


    public function add_plugin_page( ) {
        global $Bpost;

        $hook = add_options_page(
            'Bpost',
            $Bpost->__('menu_settings'),
            'manage_woocommerce',
            'Bpost-settings',
            array($this, 'print_options')
        );

        add_action('load-'.$hook, array($this, 'options_saved'));
    }

    public function print_options() {
        $this->loadSettings();

        print '<form method="post" action="options.php">';
        settings_fields('Bpost_group');
        do_settings_sections( 'Bpost_group' );
        $this->print_Bpost_options();
        print '</form>';
    }

    public abstract function print_Bpost_options();

    /**
     * @param string $select_name
     * @param string $selected_value
     *
     * @return string containing a select element with all non default fields (billing and shipping)
     *
     */
    public function get_custom_field_select($select_name, $selected_value){
        $default_fields = array('first_name','last_name','company','address_1','address_2','city','postcode','country','state','email','phone');


        $select = '<select name="' . $select_name . '"><option value="">-</option>';

        foreach( BpostWooOrder::get_billing_fields() as $field => $options ) {
            if( !in_array( $field, $default_fields ) ) {
                $name = '_billing_' . $field;
                $selected = $name == $selected_value ? 'selected' : '';
                $select .= '<option value="' . $name . '" ' . $selected . '> Cobrança: '.$options['label'].'</option>';
            }
        }

        foreach( BpostWooOrder::get_shipping_fields() as $field => $options ) {
            if( !in_array( $field, $default_fields ) ) {
                $name = '_shipping_' . $field;
                $selected = $name == $selected_value ? 'selected' : '';
                $select .= '<option value="' . $name . '" ' . $selected . '> Entrega: '.$options['label'].'</option>';
            }
        }

        return $select.'</select>';
    }

    /**
     * settings_saved
     */
    public function settings_saved(){
        $this->table_rate_shipping_plus_save();
        $this->custom_checkout_fields_save();
        BpostWoo::log("=== settings_saved");
        BpostWoo::refresh_token();
    }

    /**
     * options saved
     * Clear the token every time the user saves the settings
     * Triggered on page reload
     */
    public function options_saved(){
        if (isset($_GET['settings']) && wp_verify_nonce( sanitize_key( $_GET['settings'] ), 1 )) {
            update_option('Bpost_token','');
            update_option('Bpost_token_expires','');
        }
    }

    public function page_init(){
        /** Woo commerce is not installed nothing to do **/
        if(!function_exists('wc_get_order_statuses')){
            return;
        }

//        $this->marketplace = class_exists('BpostMarketplace') ? BpostMarketplace::instance() : null;

        register_setting( 'Bpost_group','Bpost_test', 'sanitize_text_field' );
        register_setting( 'Bpost_group', 'Bpost_maps_key', 'sanitize_text_field');
        register_setting( 'Bpost_group', 'Bpost_pickupdisable','sanitize_text_field' );
        register_setting( 'Bpost_group', 'Bpost_labelagree','sanitize_text_field');
        register_setting( 'Bpost_group', 'Bpost_autoexport','sanitize_text_field');
        register_setting( 'Bpost_group', 'Bpost_hide_not_free','sanitize_text_field');

        register_setting( 'Bpost_group','Bpost_public_key', array($this, 'sanitize_public_key') );
        register_setting( 'Bpost_group','Bpost_private_key', array($this, 'sanitize_private_key') );
        register_setting( 'Bpost_group', 'Bpost_usewpapi','sanitize_text_field');

        register_setting( 'Bpost_group', 'Bpost_table_rate_shipping_plus','sanitize_text_field');

        register_setting( 'Bpost_group' , 'Bpost_cnpj','sanitize_text_field');
        register_setting( 'Bpost_group' , 'Bpost_cpf','sanitize_text_field');
        register_setting( 'Bpost_group' , 'Bpost_neighborhood','sanitize_text_field');
        register_setting( 'Bpost_group' , 'Bpost_number','sanitize_text_field');

        register_setting( 'Bpost_group' , 'Bpost_export_virtual_products','sanitize_text_field');
        register_setting( 'Bpost_group' , 'Bpost_export_virtual_orders' ,'sanitize_text_field');

        register_setting( 'Bpost_group' , 'Bpost_custom_checkout_fields','sanitize_text_field');
        register_setting( 'Bpost_group' , 'Bpost_settings', array($this,'settings_saved'));

        $statuses = wc_get_order_statuses();

        foreach($statuses as $key => $label){
            register_setting( 'Bpost_group','Bpost_export_statuses-'.$key,'sanitize_text_field');
        }

        if ($this->marketplace) {
            $this->marketplace->register_settings();
        }
    }

    protected function loadSettings( ) {
        global $Bpost;

        $this->private_key = get_option( BpostWoo::$OPTION_PRIVATE_KEY );
        $this->public_key = get_option( BpostWoo::$OPTION_BPOST_PUBLIC_KEY );
        $this->test = get_option( 'Bpost_test' );
        $this->maps_key = get_option( 'Bpost_maps_key' );
        $this->token = get_option( BpostWoo::$OPTION_BPOST_TOKEN );
        $this->token_expires = get_option( BpostWoo::$OPTION_BPOST_TOKEN_EXPIRES );
        $this->autoexport_status = get_option( 'Bpost_autoexport' );
        $this->api = $Bpost->get_api();
        $this->hidenotfree = get_option('Bpost_hide_not_free');
        $this->CallbackUrl = BpostWoo::get_callback_url();
        $this->is_api_active = BpostWoo::is_api_active() ? 1 : 0;
        $this->usewpapi = get_option( 'Bpost_usewpapi' , $this->is_api_active && !get_option('Bpost_public_key') ? 1 : 0); // Default to use the API if we can
        $this->carriers = json_decode(get_option( 'Bpost_carriers' ));

        $this->checkToken();
        BpostWoo::log("Finished LOADING SETTINGS ");
    }

    /**
     * Retrieve and store the token and the token expires date
     */
    protected function checkToken(){
        global $woocommerce, $Bpost;


        BpostWoo::log("== Check Token");
        if(!$this->token && $this->public_key && $this->private_key) {

            wp_enqueue_script('bpost-check-token-script', '/wp-content/plugins/bpost-shipping-platform/assets/js/bpost-check-token-remove.js', array('jquery'), null, true);

            // Localize script to pass PHP variables to JavaScript
            wp_localize_script('bpost-check-token-script', 'BpostData', array());
            ?>
            <div class="notice notice-error is-dismissible">
                <p>
                    <?php echo wp_kses($Bpost->translate('Invalid Credentials'),'post'); ?>
                </p>
            </div>
            <?php
        }
        else{
            wp_enqueue_script('bpost-check-token-exists-script', '/wp-content/plugins/bpost-shipping-platform/assets/js/bpost-check-token-exists.js', array('jquery'), null, true);

            // Localize script to pass PHP variables to JavaScript
            wp_localize_script('bpost-check-token-exists-script', 'BpostData', array());
        }

        wp_enqueue_script('bpost-check-token-data-script', '/wp-content/plugins/bpost-shipping-platform/assets/js/bpost-check-token-data.js', array('jquery'), null, true);

        // Localize script to pass PHP variables to JavaScript
        wp_localize_script('bpost-check-token-data-script', 'BpostData', array());
    }

    /**
     * If zones are defined but no price is set for them,
     * Then the "Everywhere else won't be applied"
     */
    public function table_rate_checks($rates, $zones){
        $zonesWithoutRates = array();

        foreach( $zones as $zone ){
            $hasRate = false;
            foreach($rates as $rate ){
                if( $zone['id'] == $rate['zone']){
                    $hasRate = true;
                }
            }

            if(!$hasRate){
                array_push($zonesWithoutRates,  $zone);
            }
        }


        if( !empty($zonesWithoutRates) ){
            echo wp_kses("<p class='notice' style='max-width:1024px; margin-left:0px; margin-bottom:15px;'><b>
      Some zones are declared but no rate has been declared specifically for them.</b>  
      <a target='_blank' href='".admin_url('admin.php?page=wc-settings&tab=shipping&section=mh_wc_table_rate_plus')."'>If that's a mistake add them to a \"Shipping rate\".</a>",'post');

            echo wp_kses("<br/> ",'post');
            $it =0 ;
            foreach( $zonesWithoutRates as $zone ) {
                echo    wp_kses_post(($it++ ? ', ' : '') .$zone['name']);
            }
            echo wp_kses("</p>",'post');
        }
    }


    /**
     * Saves a match betwen a table_rate_shipping_plus rate and a Bpost carrier
     */
    public function table_rate_shipping_plus_save(){
        if( !is_plugin_active( 'mh-woocommerce-table-rate-shipping-plus/mh-wc-table-rate-plus.php') ){
            return;
        }

        $rates = get_option('mh_wc_table_rate_plus_table_rates');

        $Bpost_rates = array();

        foreach ( $rates as $rate ) {
            $carrier = isset($_POST['table_rate_carrier_' . $rate['id']]) ? sanitize_text_field(wp_unslash($_POST['table_rate_carrier_' . $rate['id']])) : '';

            $options = array();
            $options['carrier_id'] = $carrier;
            $options['service_level'] = isset($_POST['Bpost_service_level_' . $rate['id']]) ? sanitize_text_field(wp_unslash($_POST['Bpost_service_level_' . $rate['id']])) : '';

            $options['extra_option'] = isset($_POST['Bpost_extra_options_' . $rate['id']]) ? sanitize_text_field(wp_unslash($_POST['Bpost_extra_options_' . $rate['id']])) : '';

            $Bpost_rates[$rate['id']] = $options;
        }

        update_option('Bpost_table_rate_shipping_plus',  $Bpost_rates );
    }

    public function custom_checkout_fields_save ( ) {
        if( !is_plugin_active( 'flexible-checkout-fields/flexible-checkout-fields.php' ) ) {
            return;
        }

        $custom_co_settings = get_option('inspire_checkout_fields_settings');
        $fieldmap = array();

        if( isset( $custom_co_settings['billing'] ) ) {
            foreach ( $custom_co_settings['billing'] as $field )
            {
                if ( isset( $field['custom_field'] ) ) {
                    $matched_value = isset($_POST['Bpost_co_fields_' . $field['name']]) ? sanitize_text_field(wp_unslash($_POST['Bpost_co_fields_' . $field['name']])) : '';

                    $fieldmap[$field['name']] = $matched_value;
                }
            }
        }


        if( isset( $custom_co_settings['shipping'] ) ) {
            foreach ( $custom_co_settings['shipping'] as $field )
            {
                if ( isset( $field['custom_field'] ) ) {
                    $matched_value = isset($_POST['Bpost_co_fields_' . $field['name']]) ? sanitize_text_field(wp_unslash($_POST['Bpost_co_fields_' . $field['name']])) : '';

                    $fieldmap[$field['name']] = $matched_value;
                }
            }
        }

        update_option('Bpost_custom_checkout_fields',  $fieldmap );
    }

    public function sanitize_private_key ( $value ) {
        return stripos( $value, '*' ) ? get_option( 'Bpost_private_key' ) : sanitize_text_field( $value );
    }

    public function sanitize_public_key ( $value ) {
        BpostWoo::log("sanitize_public_key: $value ");
        return stripos( $value, '*' ) ? get_option('Bpost_public_key') : sanitize_text_field($value);
    }

    /**
     * Display only about 2/3 of the actual string
     **/
    public function obfuscate($str) {
        $len = strlen($str);
        return $len > 8 ? substr($str, 0,4) . '***' . substr($str,$len-4,$len) : '';
    }

}

