<?php
/**
 * @package bpost
 * @since 1.0.0
 */

defined('ABSPATH') || exit;

include_once(BPOST_PLUGIN_PATH . '/includes/core/class-Bpost-order.php');
/**
 * This class translates a woocommerce order object into a Bpost order object
 */
class BpostWooOrder extends BpostOrder
{
    /**
     *
     * @var mixed orderMeta
     */
    private $woo_order = null;

    /**
     * @var string Database prefix
     */
    protected $db_prefix;

    /**
     * @var object Bpost options instance
     */
    protected $BpostOptions;

    /**
     * @var string Service level option ID
     */
    protected $serviceLevelOptionId;

    protected static $billing_fields;
    protected static $shipping_fields;

    public static $api_status2wp_status = array(
        1 => 'wp-pending',
        2 => 'wc-processing',
        3 => 'wc-on-hold',
        4 => 'wc-completed',
        5 => 'wc-canceled',
        6 => 'wc-refunded',
        7 => 'wc-failed'
    );

    /**
     *  This order contains only virtual products
     */
    protected $is_virtual = 0;

    /**
     * this order is to be picked up at a physical location owned by the shop
     */
    protected $is_local_pickup = 0;

    /**
     * An array of carrier info & options as returned by the API
     * */
    protected $carriers;

    /**
     * return a new instance of a wooshiptimimizeorder
     *
     * @param $order_id
     */
    public function __construct($order_id)
    {
        global $wpdb;

        $this->db_prefix = $wpdb->prefix;
        $this->BpostOptions = BpostOptions::getInstance();
        parent::__construct(absint($order_id));  // Sanitize order ID
    }

    /**
     * @override
     * returns the order id
     * @return string  - the order id
     */
    public function get_id()
    {
        return $this->ShopItemId;
    }

    /**
     * @override
     * @return boolean true if this order is valid
     */
    public function is_valid()
    {
        $notvirtual = (get_option('Bpost_export_virtual_orders') || !$this->is_virtual);

        if (!$notvirtual) {
            array_push($this->errors, esc_html__("Only virtual products in order", 'bpost-shipping-platform'));
        }

        if ($this->is_local_pickup) {
            array_push($this->errors, esc_html__("Local Pickup Orders are not shipped, change the shipping method if you wish to ship this order", 'bpost-shipping-platform'));
        }

        return parent::is_valid() && $notvirtual && !$this->is_local_pickup;
    }

    /**
     * Set the fields necessary for brazilian orders
     */
    public function set_brazilian_fields()
    {
        $fields_cnpj = sanitize_text_field(get_option('Bpost_cnpj'));
        $fields_cpf = sanitize_text_field(get_option('Bpost_cpf'));
        $fields_neighborhood = sanitize_text_field(get_option('Bpost_neighborhood'));
        $fields_number = sanitize_text_field(get_option('Bpost_number'));

        $data = $this->woo_order->get_data();

        foreach ($data['meta_data'] as $meta) {
            $current = $meta->get_data();

            switch ($current['key']) {
                case $fields_cnpj:
                    $this->CNPJ = sanitize_text_field($current['value']);
                    break;

                case $fields_number:
                    $this->HouseNumber = sanitize_text_field($current['value']);
                    break;

                case $fields_neighborhood:
                    $this->Neighborhood = sanitize_text_field($current['value']);
                    break;

                case $fields_cpf:
                    $this->CPF = sanitize_text_field($current['value']);
                    break;
            }
        }
    }

    /**
     * @override
     */
    protected function set_client_reference()
    {
        $this->ClientReferenceCode = apply_filters('woocommerce_order_number', $this->ShopItemId, $this->woo_order);
    }


    private function set_name()
    {
        $this->CompanyName = $this->woo_order->get_shipping_company() ? trim(sanitize_text_field($this->woo_order->get_shipping_company())) : trim(sanitize_text_field($this->woo_order->get_billing_company()));

        $this->Name = $this->woo_order->get_shipping_first_name()
            ? trim(sanitize_text_field($this->woo_order->get_shipping_first_name() . ' ' . $this->woo_order->get_shipping_last_name()))
            : trim(sanitize_text_field($this->woo_order->get_billing_first_name() . ' ' . $this->woo_order->get_billing_last_name()));
    }

    /**
     * fill the pickup point info
     */
    public function set_meta()
    {
        $meta = $this->get_order_meta();

        if ($meta) {
            BpostWoo::log("This order contains metadata: " . var_export($meta, true));

            $this->Transporter = absint($meta->carrier_id);

            foreach ($this->carriers as $carrier) {
                if ($carrier->Id == $this->Transporter) {
                    foreach ($carrier->OptionList as $option) {
                        if (isset($option->IsPickup) && $option->IsPickup) {
                            $pickupoption = array(
                                'Id' => absint($option->Id),
                                'Value' => sanitize_text_field($meta->pickup_id)
                            );

                            if ($meta->pickup_extended) {
                                if (!isset($carrier->MapFields)) {
                                    BpostWoo::log("Map fields not defined for carrier $this->Transporter extended is [$meta->pickup_extended]");
                                } else {
                                    $pickupoption['OptionFields'] = array();
                                    foreach ($carrier->MapFields as $mapField) {
                                        $pickupoption['OptionFields'][] = array(
                                            'Id' => absint($mapField->Id),
                                            'Value' => sanitize_text_field($meta->pickup_extended)
                                        );
                                    }
                                }
                            }

                            if ($meta->pickup_id) {
                                $this->OptionList[] = $pickupoption;
                            }
                        }
                    }
                }
            }
        }
    }

    private function set_address()
    {
        #returns a code as defined in i18n/states/{country_iso2}.php
        $this->State = sanitize_text_field($this->woo_order->get_shipping_state());
        $countries = new WC_Countries();

        //   Some clients hide the shipping country on checkout and belive it or not.. some leave it empty!
        $country = $this->woo_order->get_shipping_country() ? sanitize_text_field($this->woo_order->get_shipping_country()) : sanitize_text_field($this->woo_order->get_billing_country());
        $states = $countries->get_states($country);

        //States in dropdowns
        if (!isset($states[$this->State])) {
            $this->State = '';
        }

        //It's possible for the shipping address to be entirely blank
        if ($this->woo_order->get_shipping_address_1()) {
            $this->Streetname1 = sanitize_text_field($this->woo_order->get_shipping_address_1());
            $this->Streetname2 = sanitize_text_field($this->woo_order->get_shipping_address_2());
            $this->City = sanitize_text_field($this->woo_order->get_shipping_city());
            $this->PostalCode = sanitize_text_field($this->woo_order->get_shipping_postcode());
        } else {
            $this->Streetname1 = sanitize_text_field($this->woo_order->get_billing_address_1());
            $this->Streetname2 = sanitize_text_field($this->woo_order->get_billing_address_2());
            $this->City = sanitize_text_field($this->woo_order->get_billing_city());
            $this->PostalCode = sanitize_text_field($this->woo_order->get_billing_postcode());
        }

        $this->Country = $country;
        $this->Email = sanitize_email($this->woo_order->get_billing_email());
        $this->Phone = sanitize_text_field($this->woo_order->get_billing_phone());

        $this->check_custom_checkout_fields();
    }

    /**
     * If plugin is active and we have stored a map for those fields
     * Set them in the order
     **/
    private function check_custom_checkout_fields()
    {
        # Get our settings for the fields
        $oursettings = get_option('Bpost_custom_checkout_fields');

        if (!$oursettings) {
            return;
        }

        # Does this order contain any mapped custom fields?
        foreach ($oursettings as $customfield => $apiField) {
            $order = wc_get_order($this->ShopItemId);
            $customvalue = sanitize_text_field($order->get_meta('_' . sanitize_key($customfield), true));

            if ($customvalue) {
                $this->{$apiField} = $customvalue;
            }
        }
    }

    /*
  * We have no way to know what box size people are using so we ignore dimensions.
  * We add the weight of the product when available
  * TODO: ask about this, should we set it to zero accross the board or is this method ok?
  */
    private function set_dimensions()
    {
        $items = $this->woo_order->get_items();
        $weight = 0;
        $description = '';
        $this->ShipmentItems = array();
        $exportvirtualproducts = get_option('Bpost_export_virtual_products');

        $is_virtual = 1;
        foreach ($items as $item) {
            $product = $item->get_product();
            if (!empty($product) && !is_bool($product)) {
                $includeproduct = $exportvirtualproducts || !$product->is_virtual();

                //    Remember that not all items are products

                if ($product && $includeproduct) {
                    $is_virtual = 0;
                    $qty = absint($item->get_quantity());
                    $item_weight = 0;

                    if ($product->has_weight()) {
                        $productweight = sanitize_text_field($product->get_weight());
                        if (is_numeric($qty) && is_numeric($productweight)) {
                            $item_weight = floor(wc_get_weight(floatval($productweight), 'g'));
                        }

                        $weight += $qty * $item_weight;
                    }

                    $description .= esc_html($product->get_description() ? $product->get_description() : $qty . ' - ' . $product->get_name() . " ");

                                    // Get HS code and Country of Origin for this product
                $bpost = BpostWoo::instance();
                $hs_code = $bpost->get_product_hs_code($product);
                $country_of_origin = $bpost->get_product_country_of_origin($product);

                $shipment_item = array(
                    'Count' => $qty,
                    'Id' => absint($item->get_product_id()),
                    'Name' => esc_html($product->get_name()),
                    'Type' => '',
                    'Value' => floatval($item->get_subtotal() / $qty),
                    'Weight' => $item_weight,
                    'ArticleNumber' => sanitize_text_field($product->get_sku()),
                );


                // Add HS code if available
                if (!empty($hs_code)) {
                    $shipment_item['HSCode'] = sanitize_text_field($hs_code);
                }

                // Add Country of Origin if available
                if (!empty($country_of_origin)) {
                    $shipment_item['OriginCountry'] = sanitize_text_field($country_of_origin);
                }

                    $this->ShipmentItems[] = $shipment_item;
                    $this->Description = $description;

                }
            }
        }

        if ($weight > 0) {
            $this->Weight = $weight;
        }

        $this->is_virtual = $is_virtual;
    }

    /**
     *  Check if the paymentmethod is COD then:
     *  1) Client has only one carrier and  it has COD => set the COD OPTION
     *  2) It's a Bpost carrier which supports COD if not set, add the COD Option
     */
    public function set_carrier_cod()
    {
        $payment_method = sanitize_text_field($this->woo_order->get_payment_method());

        if ($payment_method != 'cod') {
            return;
        }

        if (count($this->carriers) == 1) {
            $this->Transporter = absint($this->carriers[0]->Id);
        }

        if (!$this->Transporter) {
            foreach ($this->carriers as $carrier) {
                if ($carrier->Id == $this->Transporter) {
                    foreach ($carrier->OptionList as $option) {
                        if ($option->Id == 2) {
                            $this->OptionList[] = array(
                                'Id' => 2,
                                'Value' => floatval($this->woo_order->get_total()),
                                'OptionFields' => array(
                                    array('Id' => 1, 'Value' => floatval($this->woo_order->get_total()))
                                )
                            );
                        }
                    }
                }
            }
        }
    }

    /**
     * Set carrier associated stuff like service level
     */
    public function set_carrier() {
        // Figure out if this is a local pickup

        ##Reseno
        $order = wc_get_order( $this->ShopItemId ); // returns WC_Order object.

        $Bpost_carrier = $order->get_meta(  'Bpost_carrier' , true);
        $settings = '';
        $this->serviceLevelOptionId ='';

//  plugins that don't use instance ids ..
        if( $Bpost_carrier ) {
            $Bpost_carrier = json_decode($Bpost_carrier);

            $this->Transporter = $Bpost_carrier->carrier_id;

            if( $Bpost_carrier->service_level != '-' ){
                $this->serviceLevelOptionId = $Bpost_carrier->service_level;
                $this->extraOptionId = $Bpost_carrier->extra_option;
            }
        }
//  Regular woo shipping methods you add to zones
        else {
            BpostWoo::log("Regular Woo method  will request shipping items  ");

            $this->ShippingMethodName = $this->woo_order->get_shipping_method();
            foreach ( $this->woo_order->get_items('shipping') as $item_id => $shipping_item  ) {
                $shipping_method_id = $shipping_item->get_method_id();
                if ( $shipping_method_id == 'local_pickup' ) {
                    $this->is_local_pickup = 1;
                }
                else {
                    $shipping_instance_id = $shipping_item->get_instance_id();
                    $this->ShippingMethodId = $shipping_method_id . '_' . $shipping_instance_id;

                    if (stripos($shipping_method_id, '_weight')) { //wbs
                        $settings =  get_option("wbs_".$shipping_instance_id."_Bpost");
                    }
                    else { //flat rates
                        $settings = get_option('woocommerce_'.$shipping_method_id.'_'.$shipping_instance_id.'_settings');
                    }

                    $results = array();
                    preg_match( "/shipping_Bpost_([\d]*)/", $shipping_method_id, $results);
                    if(isset($results[1])){
                        $this->Transporter = $results[1];

                        if(isset($settings['service_level']) && $settings['service_level'] && $settings['service_level'] != '-'){
                            $this->serviceLevelOptionId = $settings['service_level'];
                        }
                    }
                }
            } /** for each **/
        }

        if ($this->serviceLevelOptionId) {
            $serviceLevelIds =  get_option( 'Bpost_servicelevelids' );
            if (isset($serviceLevelIds[$this->Transporter])) {
                $this->add_option($serviceLevelIds[$this->Transporter], $this->serviceLevelOptionId);
            }
            else {
                BpostWoo::log("Invalid service level id for order $this->ShopItemId. Did something change in the carrier settings ? ");
            }
        }

        if ( $settings ) {
            BpostWoo::log(  $this->ShippingMethodName  . " settings " . var_export($settings,true));

            foreach ($this->BpostOptions->getCheckoutStrIds() as  $fieldstr) {
                BpostWoo::log("CheckOUT  OPTION $fieldstr ");
                $this->checkSimpleOptionWithOrderValue($settings,$fieldstr);
            }

            $this->checkSimpleOptionWithOrderValue($settings,'extraoptions');
        }

        if (!$this->Transporter && Bpost_is_marketplace()) {
            $mkp = BpostMarketplace::instance();
            $transporter = $mkp->get_carrier_for_order($this);
            if ($transporter > 0) {
                $this->Transporter = $transporter;
            }
        }

        $this->set_carrier_cod();
    }

    protected function add_option($optionid, $optionvalue)
    {
        if ($optionid == '-') {
            BpostWoo::log("Invalid optionid $optionid");
            return;
        }

        if ($optionvalue == '-') {
            BpostWoo::log("Invalid option value $optionvalue");
            return;
        }

        $this->OptionList[] = array(
            "Id" => absint($optionid),
            "Value" => sanitize_text_field($optionvalue)
        );
    }

    /**
     * Options who's value is the order value
     * cash on delivery and insurance
     */
    protected function checkSimpleOptionWithOrderValue($settings, $optionname)
    {
        BpostWoo::log("Checking $optionname");
        if (isset($settings[$optionname]) && $settings[$optionname]) {
            $optionvalue = sanitize_text_field($settings[$optionname]);
            $childOptionId = 1;

            if (isset($settings[$optionname . $optionvalue])) {
                $childOptionId = absint($settings[$optionname . $optionvalue]);
            }

            if ($optionvalue != '-') {
                $option = $this->BpostOptions->getOptionValue($this, $optionvalue, $childOptionId);

                if (!$option) {
                    BpostWoo::log("Error fetching  option for $optionname " . $settings[$optionname]);
                    return;
                }

                if (!isset($option->Value) || $option->Value != '-') {
                    $this->OptionList[] = $option;
                }
            }
        }
    }

    /**
     * https://docs.woocommerce.com/wc-apidocs/class-WC_Order.html
     * @override
     */
    protected function bootstrap()
    {
        $this->woo_order = wc_get_order($this->ShopItemId);
        $this->carriers = json_decode(get_option('Bpost_carriers'));

        if (!$this->woo_order) {
            BpostWoo::log("Invalid order to bootstrap with id $this->ShopItemId ");
            return;
        }

        $this->set_name();
        $this->set_address();
        $this->set_dimensions();
        $this->set_client_reference();

        $this->Value = floatval($this->woo_order->get_total());

        $meta = self::get_shipping_meta($this->ShopItemId);

        if ($meta) {
            $this->Bpost_message = sanitize_text_field($meta->message);
            $this->Bpost_status = absint($meta->status);
        }

        if (get_locale() == 'pt_BR') {
            $this->set_brazilian_fields();
        }

        $this->set_carrier();
        $this->set_meta();
    }

    public function set_message($message)
    {
        global $wpdb;

        if (!$this->ShopItemId) {
            return false;
        }

        // Skip saving messages that contain "Invalid country code"
        if (strpos($message, 'Invalid country code') !== false) {
            return false;
        }

        $this->Bpost_message = sanitize_text_field($message);

        if (self::get_shipping_meta($this->ShopItemId)) {

            // phpcs:ignore
            return $wpdb->update(
                "{$wpdb->prefix}Bpost", // Table name
                array('message' => $this->Bpost_message), // Data to update (column => value)
                array('id' => $this->ShopItemId), // Where clause (column => value)
                array('%s'), // Data format for the update
                array('%d')  // Data format for the where clause
            );
        }

        // phpcs:ignore
        return $wpdb->insert(
            "{$wpdb->prefix}Bpost", // Table name
            array(
                'id' => $this->ShopItemId,
                'message' => $this->Bpost_message
            ), // Data to insert (column => value)
            array(
                '%d', // Format for id
                '%s'  // Format for message
            )
        );
    }

    public function set_status($status)
    {
        global $wpdb;

        if (!$this->ShopItemId) {
            return false;
        }

        $this->Bpost_status = absint($status);

        if (self::get_shipping_meta($this->ShopItemId)) {
            // phpcs:ignore
            return $wpdb->query($wpdb->prepare("update {$wpdb->prefix}Bpost set status=%d where id=%d", $this->Bpost_status, $this->ShopItemId));
        }

        // phpcs:ignore
        return $wpdb->query($wpdb->prepare("insert into {$wpdb->prefix}Bpost (`id`,`status`) VALUES(%d, %d)", $this->ShopItemId, $this->Bpost_status));
    }

    /**
     * Used to push status from the api into the plugin
     */
    public function set_status_from_api($status)
    {
        global $Bpost;

        BpostWoo::log("status update for order {$this->ShopItemId} => $status");

        if (!isset(self::$api_status2wp_status[$status])) {
            BpostWoo::log("unknown status ignoring ");
            return;
        }

        $wp_status = sanitize_text_field(self::$api_status2wp_status[$status]);
        $this->woo_order->update_status($wp_status, esc_html__('pushed from the api ', 'bpost-shipping-platform') . gmdate('d-m-Y H:i'));
        $this->add_message($this->get_formated_message($Bpost->translate("api sent status") . ' ' . $wp_status));
    }

    public function set_tracking_id($tracking_id, $tracking_url = '')
    {
        global $wpdb, $Bpost;


        $order = wc_get_order($this->ShopItemId);
        $tracking_id = sanitize_text_field($tracking_id);

        if ($tracking_id == sanitize_text_field($order->get_meta('Bpost_trackingid', true))) {
            BpostWoo::log("Order already has trackingid $tracking_id ignoring");
            return;
        }

        error_log("Updating tracking $tracking_id  and checking tracking url $tracking_url  ||for order [$this->ShopItemId]");

        $this->add_message($this->get_formated_message($Bpost->translate("api sent trackingId:") . ' ' . $tracking_id));

        $sql = "update  {$wpdb->prefix}Bpost set tracking_id=%s where id=%d";
        $this->executeSQL($sql, [
            $tracking_id,
            absint($this->ShopItemId)
        ]);

        $this->woo_order->add_order_note(esc_html__("TRACKING", 'bpost-shipping-platform') . $tracking_id);

        if ($tracking_id) {
            $order->update_meta_data('Bpost_trackingid', $tracking_id);
        }

        if ($tracking_url) {
            $order->update_meta_data('Bpost_trackingurl', esc_url($tracking_url));
        }

        $order->save();
        $this->set_status(BpostOrder::$LABEL_STATUS_PRINTED);
    }

    /**
     * @return iso2 country
     */
    public function get_country()
    {
        return sanitize_text_field($this->Country);
    }

    /**
     * We will use this to generate the notice on the bulk action,
     * Since we are forced to redirect
     *
     * @param object $summary
     *
     * @return a string containing the notifications html
     */
    public static function get_export_summary($summary)
    {
        global $Bpost;


        if( isset( $summary->message ) ){
            return  '<div class="notice notice-info"><p>' . $summary->message . '</p></div>';
        }

        $html = '<div class="notice notice-info">';

        $html.= '<p>'.sprintf(
                'Sent %d orders. <br/>Exported: %d <br/> With Errors: %d',
                $summary->nOrders,
                $summary->n_success,
                $summary->nInvalid + $summary->n_errors
            );

        $html.='</p>';

        if( isset($summary->login_url) ) {
            $html.='<p> 
        <strong>'. $Bpost->translate( 'Click') .' <a href="' . $summary->login_url . '" target="_blank">' . BPOST_BRAND . '</a> ' .$Bpost->translate('if not opened') . '.</strong></p>';
        }

        $html.= '</div>';

        return $html;
    }

    public static function get_billing_fields()
    {
        if (!self::$billing_fields) {
            self::set_woo_extra_fields();
        }

        return self::$billing_fields;
    }

    public static function get_shipping_fields()
    {
        if (!self::$shipping_fields) {
            self::set_woo_extra_fields();
        }

        return self::$shipping_fields;
    }

    /**
     *  Some plugins call this function from inside the custom id filter
     *
     * @return the order in which this order was created
     */
    public function get_date_created()
    {
        return $this->woo_order->get_date_created();
    }

    /**
     * @return the order value
     */
    public function getOrderValue()
    {
        return number_format(floatval($this->Value), 2, '.', '');
    }

    /**
     *  Get message for this order
     * @param int $post_id
     */
    public static function get_shipping_status($post_id)
    {
        global $wpdb;

        // phpcs:ignore
        $spMeta = $wpdb->get_row($wpdb->prepare("select status from {$wpdb->prefix}Bpost where id = %d ", absint($post_id)));
        return $spMeta ? absint($spMeta->status) : 1;
    }

    public static function get_shipping_message($post_id)
    {
        global $wpdb;

        // phpcs:ignore
        $spMeta = $wpdb->get_row($wpdb->prepare("select message from {$wpdb->prefix}Bpost where id = %d ", absint($post_id)));
        return $spMeta ? sanitize_text_field($spMeta->message) : '';
    }

    public static function get_shipping_meta($post_id)
    {
        global $wpdb;

        // phpcs:ignore
        return $wpdb->get_row($wpdb->prepare("select * from {$wpdb->prefix}Bpost where id=%d", absint($post_id)));
    }

    public static function get_status_label($status)
    {
        global $Bpost;

        switch ($status) {
            case BpostOrder::$STATUS_NOT_EXPORTED:
                return esc_html__('Not Exported', 'bpost-shipping-platform');

            case BpostOrder::$STATUS_EXPORTED_SUCCESSFULLY:
                return esc_html__('Exported', 'bpost-shipping-platform');

            case BpostOrder::$STATUS_EXPORT_ERRORS:
                return esc_html__('Error on Export', 'bpost-shipping-platform');
        }
    }

    public function get_product_with_meta($meta_key, $meta_value, $replace_total_weight = false)
    {
        $items = $this->woo_order->get_items();

        if (!is_array($items)) {
            return array();
        }

        $weight = 0;
        $ShipmentItems = array();

        foreach ($items as $item) {
            $product = $item->get_product();
            $vendor_id = wc_get_order_item_meta($item->get_id(), sanitize_key($meta_key), true);

            if ($product && (sanitize_key($meta_value) == $vendor_id)) {
                $qty = absint($item->get_quantity());
                $item_weight = 0;

                if ($product->has_weight()) {
                    $item_weight = floor(wc_get_weight(floatval($product->get_weight()), 'g'));
                    $weight += $qty * $item_weight;
                }

                // Get HS code and Country of Origin for this product
                $bpost = BpostWoo::instance();
                $hs_code = $bpost->get_product_hs_code($product);
                $country_of_origin = $bpost->get_product_country_of_origin($product);

                $shipment_item = array(
                    'Count' => $qty,
                    'Id' => absint($item->get_product_id()),
                    'Name' => esc_html($product->get_name()),
                    'Type' => '',
                    'Value' => floatval($item->get_subtotal() / $qty),
                    'Weight' => $item_weight,
                );

                // Add HS code if available
                if (!empty($hs_code)) {
                    $shipment_item['HSCode'] = sanitize_text_field($hs_code);
                }

                // Add Country of Origin if available
                if (!empty($country_of_origin)) {
                    $shipment_item['OriginCountry'] = sanitize_text_field($country_of_origin);
                }
                
                $ShipmentItems[] = $shipment_item;
            }
        }

        if ($replace_total_weight) {
            $this->Weight = $weight;
        }

        return $ShipmentItems;
    }

    public function get_woo_order()
    {
        return $this->woo_order;
    }

    public static function shipments_response($response)
    {
        global $Bpost;

        $summary = (object) array(
            'errors' => array(),
            'n_success' => 0,
            'n_errors' => 0,
            'orderresponse' => array()
        );

        BpostWoo::log("API responded with $response->httpCode");

        if ($response->httpCode != 200) {
            $summary->message = $response->httpCode ? "Error in api $response->httpCode" : "Api did not respond ";
            return $summary;
        }

        foreach ($response->response->Shipment as $shipment) {
            $id = $shipment->ShopItemId;
            $order = new BpostWooOrder($id);
            $hasErrors = isset($shipment->ErrorList);

            $summary->orderresponse[] = $shipment;

            $statusToSet = BpostOrder::$STATUS_EXPORTED_SUCCESSFULLY;

            if ($hasErrors) {
                $order->append_errors($shipment->ErrorList);
                $actualerror = 1;
                foreach ($shipment->ErrorList as $error) {
                    if ($error->Id == 298) {
                        BpostWoo::log("Order $shipment->ShopItemId ");
                        $order->set_status(BpostOrder::$STATUS_NOT_EXPORTED);
                        $order->append_errors(array(
                            (object) array("Tekst" => esc_html__("Shipment was deleted in the app. Export again", 'bpost-shipping-platform'))
                        ));
                    } else if ($error->Id == 297 || $error->Id == 200) {
                        BpostWoo::log("Considering error $error->Id as warning. $error->Tekst");
                        $actualerror = 0;
                    } else {
                        BpostWoo::log("Appending Error $error->Id $error->Tekst");
                        $summary->errors[] = esc_html("$id - " . $error->Tekst);
                    }
                }

                if ($actualerror) {
                    ++$summary->n_errors;
                    $statusToSet = BpostOrder::$STATUS_EXPORT_ERRORS;
                } else {
                    ++$summary->n_success;
                    $statusToSet = BpostOrder::$STATUS_EXPORTED_SUCCESSFULLY;
                }

                $order->set_status($statusToSet);
            } else {
                ++$summary->n_success;
                $order->set_status($statusToSet);
            }

            if (isset($shipment->WarningList)) {
                foreach ($shipment->WarningList as $warning) {
                    BpostWoo::log("Appending Error $warning->Id $warning->Tekst");
                    $summary->errors[] = array(
                        'Id' => absint($warning->Id),
                        'Tekst' => esc_html__('Warn ', 'bpost-shipping-platform') . sanitize_text_field($warning->Tekst),
                        'ShopItemId' => absint($shipment->ShopItemId)
                    );
                }
            }

            $message = self::get_formated_message(self::get_status_label($statusToSet));
            $order->add_message($message);
        }

        return $summary;
    }

    public static function export ( $orders2Export, $try = 0, $printLabel = false,$changesAddress = null) {
        global $wpdb;

        $summary = (object)array(
            'n_success' => 0,
            'n_errors' => 0,
            'nOrders' => 0,
            'nInvalid' => 0,
            'errors' => array(),
            'orderresponse' => array()
        );

        if(! count( $orders2Export ) ){
            return $summary;
        }

        $Bpost_patch_orders = array();
        $Bpost_orders = array();
        $nInvalid = 0;

        $api = BpostWoo::get_api();

        foreach($orders2Export as $id){
            $order = new BpostWooOrder($id);
            $ordermeta = $order->get_order_meta();

            if ( isset($ordermeta->status) && $ordermeta->status == BpostOrder::$STATUS_EXPORTED_SUCCESSFULLY) {
                array_push( $Bpost_patch_orders, $order->get_api_props($changesAddress) );
            }
            else if ( $order->is_valid() ){
                array_push( $Bpost_orders, $order->get_api_props() );
            }
            else {
                ++$nInvalid;
                $order->set_status(BpostWooOrder::$STATUS_EXPORT_ERRORS);
                $order->set_message('<b>Error:</b><br/> ' . $order->get_error_messages());
                //Fetch this posts metadata
                // phpcs:ignore
                $post_meta = $wpdb->get_results(
                    $wpdb->prepare(
                        "SELECT * FROM {$wpdb->prefix}postmeta WHERE post_id = %d",
                        $id
                    )
                );
                $metastr = '<br/><b> Shipping && Billing Metadata</b>';
                foreach($post_meta as $m){
                    if(stripos($m->meta_key, 'shipping') || stripos($m->meta_key, 'billing')){
                        $metastr .= '<br/>';
                    }
                }

                $order->add_message($metastr);
                array_push( $summary->errors ,$order->get_error_messages());
            }
        }

        if (count($Bpost_orders)) {
            if ($printLabel){
                $response = $api->post_shipments($Bpost_orders,$order->getClientReferenceCode());
            }
            else{
                $response = $api->post_shipments($Bpost_orders);
            }
            error_log("Order export response is: " . json_encode($response));
            if ($response->httpCode == 401 && $try < 1) {
                BpostWoo::refresh_token();
                return self::export($orders2Export, 1,$printLabel);
            }

            $summary = self::shipmentsResponse($response,$printLabel);

            if (isset($response->response->AppLink)) {
                $summary->login_url =$response->response->AppLink;
            }
        }

        // PATCH Existing orders
        if (count($Bpost_patch_orders)) {
            if ($printLabel){
                $response = $api->patch_shipments($Bpost_patch_orders,$order->getClientReferenceCode());
            }else{
                $response = $api->patch_shipments($Bpost_patch_orders);
            }

            if ($response->httpCode == 401 && $try < 1) {
                BpostWoo::refresh_token();
                return self::export($orders2Export, 1,$printLabel);
            }

            else {
                $patchsummary = self::shipmentsResponse($response,$printLabel);

                $summary->n_success += $patchsummary->n_success;
                $summary->n_errors += $patchsummary->n_errors;

                foreach($patchsummary->orderresponse as $order) {
                    $summary->orderresponse[] = $order;
                }
            }

            if (isset($response->response->AppLink)) {
                $summary->login_url =$response->response->AppLink;
            }
        }

        $summary->nOrders = count($orders2Export);
        $summary->nInvalid = $nInvalid;

        return $summary;
    }

    public static function export_all()
    {
        global $wpdb;

        $export_status = '"' . implode('","', self::get_valid_status_to_export_all()) . '"';

        // phpcs:ignore
        $orders2Export = $wpdb->get_results($wpdb->prepare(
            "SELECT {$wpdb->prefix}posts.ID, status, post_status
    FROM {$wpdb->prefix}Bpost
    RIGHT JOIN {$wpdb->prefix}posts
    ON {$wpdb->prefix}Bpost.id = {$wpdb->prefix}posts.ID
    WHERE post_type = %s 
    AND (status IS NULL OR status != %d) 
    AND post_status IN (%s)",
            'shop_order',
            BpostOrder::$STATUS_EXPORTED_SUCCESSFULLY,
            $export_status
        ));

        $ids = array();
        foreach ($orders2Export as $dbOrder) {
            $ids[] = absint($dbOrder->ID);
        }

        BpostWoo::log("Export all orders: " . join(',', $ids));
        $summary = self::export($ids);

        wp_redirect(BpostWooOrder::get_redirect_from_summary($summary));
        die();
    }

    public static function print_label($orderids)
    {
        global $Bpost;

        if (empty($orderids)) {
            BpostWoo::log("\nno order id was provided, cannot print label");
            return array('error' => esc_html__('no order id was provided', 'bpost-shipping-platform'));
        }

        BpostWoo::log("\n\n=== Requesting label for " . implode(',', array_map('absint', $orderids)));

        $summary = BpostWooOrder::export($orderids);
        BpostWoo::log("\n Export summary " . wp_json_encode($summary));

        $labelorders = array();
        $errors = array();

        if (isset($summary->orderresponse)) {
            if (isset($summary->message)) {
                $errors[] = esc_html($summary->message);
            }

            foreach ($summary->orderresponse as $order) {
                if (isset($order->ErrorList)) {
                    foreach ($order->ErrorList as $error) {
                        if ($error->Id > 0 && ($error->Id != 200) && ($error->Id != 297)) {
                            $errors[] = esc_html__('Error: ', 'bpost-shipping-platform') . esc_html($error->Tekst);
                            BpostWoo::log("Not printing $order->ShopItemId because $error->Tekst ");
                        } else {
                            BpostWoo::log("Ignoring error $error->Id for $order->ShopItemId $error->Tekst ");
                            $labelorders[] = absint($order->ShopItemId);
                        }
                    }
                } else {
                    BpostWoo::log("Printing label for $order->ShopItemId");
                    $labelorders[] = absint($order->ShopItemId);
                }
            }
        } else {
            BpostWoo::log("No orders in export summary");
        }

        BpostWoo::log("Label orders  " . wp_json_encode($labelorders));
        BpostWoo::log("\nErrors " . wp_json_encode($errors));


        if (!empty($labelorders)) {
            $labelReference = array();
            foreach ($labelorders as $orderid) {
                $reference = apply_filters('woocommerce_order_number', absint($orderid), wc_get_order($orderid));
                $labelReference[] = esc_html($reference);
                BpostWoo::log("label for order id $orderid  ref $reference");
            }

            $labelresponse = BpostWoo::get_api()->post_labels_step1($labelReference);
            BpostWoo::log("Label response is " . var_export($labelresponse, true));
            if (isset($labelresponse->response->ErrorList)) {
                foreach ($labelresponse->response->ErrorList as $error) {
                    $errors[] = esc_html($error->Info);
                }
            }
            BpostWoo::log("Labelresponse " . wp_json_encode($labelresponse));
            return $labelresponse;
        } else {
            $errors[] = esc_html__('no labels to print', 'bpost-shipping-platform');
        }

        return array('errors' => array_merge($summary->errors, $errors));
    }

    public static function get_redirect_from_summary($summary)
    {
        $url_string = '';
        foreach ((array)$summary as $key => $value) {
            $url_string .= '&Bpost_' . esc_attr($key) . '=' . esc_attr($value);
        }

        $paged = isset($_GET['paged']) ? absint($_GET['paged']) : 1; // Sanitize paged as an absolute integer with default value
        $url_string = esc_url_raw($url_string); // Sanitize the additional URL string if dynamic

        // Construct the admin URL
        return admin_url("edit.php?post_type=shop_order&paged=" . $paged . $url_string);

    }

    static public function get_valid_status_to_export_all()
    {
        $statuses = wc_get_order_statuses();
        $status_list = array();

        foreach ($statuses as $status_key => $status_label) {
            if (get_option('Bpost_export_statuses-' . sanitize_key($status_key))) {
                $status_list[] = sanitize_text_field($status_key);
            }
        }
        return $status_list;
    }

    public function executeSQL($sql, $params = [])
    {
        global $wpdb;

        if (!empty($params)) {
            // phpcs:ignore
            $prepared_sql = $wpdb->prepare($sql, array_map('sanitize_text_field', $params));
        } else {
            $prepared_sql = sanitize_text_field($sql);
        }

        // phpcs:ignore
        return $wpdb->query($prepared_sql);
    }

    public function sqlSelect($sql, $params = [])
    {
        global $wpdb;

        if (!empty($params)) {
            // phpcs:ignore
            $prepared_sql = $wpdb->prepare($sql, array_map('sanitize_text_field', $params));

        } else {
            $prepared_sql = sanitize_text_field($sql);
        }

        error_log($prepared_sql);
        // phpcs:ignore
        return $wpdb->get_results($prepared_sql);
    }

    public static function set_woo_extra_fields()
    {
        self::$billing_fields = apply_filters(
            'woocommerce_admin_billing_fields', array(
                'first_name' => array(
                    'label' => esc_html__('First name', 'bpost-shipping-platform'),
                    'show' => false,
                ),
                'last_name' => array(
                    'label' => esc_html__('Last name', 'bpost-shipping-platform'),
                    'show' => false,
                ),
                'company' => array(
                    'label' => esc_html__('Company', 'bpost-shipping-platform'),
                    'show' => false,
                ),
                'address_1' => array(
                    'label' => esc_html__('Address line 1', 'bpost-shipping-platform'),
                    'show' => false,
                ),
                'address_2' => array(
                    'label' => esc_html__('Address line 2', 'bpost-shipping-platform'),
                    'show' => false,
                ),
                'city' => array(
                    'label' => esc_html__('City', 'bpost-shipping-platform'),
                    'show' => false,
                ),
                'postcode' => array(
                    'label' => esc_html__('Postcode / ZIP', 'bpost-shipping-platform'),
                    'show' => false,
                ),
                'country' => array(
                    'label' => esc_html__('Country', 'bpost-shipping-platform'),
                    'show' => false,
                    'class' => 'js_field-country select short',
                    'type' => 'select',
                    'options' => array('' => esc_html__('Select a country&hellip;', 'bpost-shipping-platform')) + WC()->countries->get_allowed_countries(),
                ),
                'state' => array(
                    'label' => esc_html__('State / County', 'bpost-shipping-platform'),
                    'class' => 'js_field-state select short',
                    'show' => false,
                ),
                'email' => array(
                    'label' => esc_html__('Email address', 'bpost-shipping-platform'),
                ),
                'phone' => array(
                    'label' => esc_html__('Phone', 'bpost-shipping-platform'),
                ),
            )
        );

        self::$shipping_fields = apply_filters(
            'woocommerce_admin_shipping_fields', array(
                'first_name' => array(
                    'label' => esc_html__('First name', 'bpost-shipping-platform'),
                    'show' => false,
                ),
                'last_name' => array(
                    'label' => esc_html__('Last name', 'bpost-shipping-platform'),
                    'show' => false,
                ),
                'company' => array(
                    'label' => esc_html__('Company', 'bpost-shipping-platform'),
                    'show' => false,
                ),
                'address_1' => array(
                    'label' => esc_html__('Address line 1', 'bpost-shipping-platform'),
                    'show' => false,
                ),
                'address_2' => array(
                    'label' => esc_html__('Address line 2', 'bpost-shipping-platform'),
                    'show' => false,
                ),
                'city' => array(
                    'label' => esc_html__('City', 'bpost-shipping-platform'),
                    'show' => false,
                ),
                'postcode' => array(
                    'label' => esc_html__('Postcode / ZIP', 'bpost-shipping-platform'),
                    'show' => false,
                ),
                'country' => array(
                    'label' => esc_html__('Country', 'bpost-shipping-platform'),
                    'show' => false,
                    'type' => 'select',
                    'class' => 'js_field-country select short',
                    'options' => array('' => esc_html__('Select a country&hellip;', 'bpost-shipping-platform')) + WC()->countries->get_shipping_countries(),
                ),
                'state' => array(
                    'label' => esc_html__('State / County', 'bpost-shipping-platform'),
                    'class' => 'js_field-state select short',
                    'show' => false,
                ),
            )
        );
    }

    public static function shipmentsResponse($response, $printLabel = false)
    {
        global $Bpost;



        $summary = (object) [
            "n_success" => 0,
            "n_errors" => 0,
            "orderresponse" => [],
            "errors" => [],
            'callbackUrl' => ''
        ];

        if ($response->httpCode != 200) {
            return $summary;
        }

        if (isset($response->response->Shipment)) {
            foreach ($response->response->Shipment as $shipment) {
                $orderid = absint($shipment->ShopItemId);
                error_log("Order id is: " . $orderid);
                $shipmentid = 0;
                if (stripos($shipment->ClientReferenceCode, '--') !== false) {
                    $parts = explode('--', sanitize_text_field($shipment->ClientReferenceCode));
                    $orderid = absint($shipment->ShopItemId);
                    $shipmentid = absint($parts[1]);
                }

                $orderReferenceCode = sanitize_text_field($shipment->ClientReferenceCode);

                $summary->orderresponse[] = $shipment;
                $id = absint($shipment->ShopItemId);
                $order = new BpostWooOrder($orderid);
                $order->bootstrap();
                $actualerror = 0;
                $hasErrors = isset($shipment->ErrorList);
                $order->grant_order_meta_exists($orderid);
                error_log("Has errors: " .$hasErrors);
                if ($hasErrors) {
                    $order->append_errors($shipment->ErrorList);
                    $actualerror = 1;
                    foreach ($shipment->ErrorList as $error) {
                        if ($error->Id == 200) {
                            error_log("Order reference $shipment->ClientReferenceCode  was exported but status is not correctly set");
                            $order->set_status(BpostOrder::$STATUS_EXPORTED_SUCCESSFULLY);

                            self::export([
                                'shipmentid' => $shipmentid,
                                'orderid' => $orderid
                            ], 1, 1, $printLabel);

                            $actualerror = 0;
                        }

                        if ($error->Id == 298) {
                            error_log("Order $shipment->ShopItemId  was deleted in app export again");
                            $order->set_status(BpostOrder::$STATUS_NOT_EXPORTED);
                            self::export([
                                'shipmentid' => $shipmentid,
                                'orderid' => $orderid
                            ], 1, $printLabel);

                            $actualerror = empty($labelsummary->errors) ? 0 : 1;
                        } else if ($error->Id == 297 || $error->Id == 200) {
                            error_log("Considering error $error->Id as warning. $error->Tekst");
                            $actualerror = 0;
                        } else {
                            error_log("Appending Error $error->Id $error->Tekst");
                            $summary->errors[] = sanitize_text_field("$id - " . $error->Tekst);
                        }
                    }
                }

                if ($actualerror) {
                    ++$summary->n_errors;
                } else {
                    ++$summary->n_success;
                }

                $statusToSet = $actualerror ? BpostOrder::$STATUS_EXPORT_ERRORS : BpostOrder::$STATUS_EXPORTED_SUCCESSFULLY;
                error_log("Status setting: " .$statusToSet);
                $order->set_status($statusToSet);

                $warnings = '';

                if (isset($shipment->WarningList)) {
                    foreach ($shipment->WarningList as $warning) {
                        $warnings .= esc_html($warning->Tekst) . '<br/>';
                    }
                }

                $order->add_message(
                    $order->get_formated_message(
                        $warnings . ' ' . self::getStatusLabel($statusToSet)
                    )
                );
            }
        }

        return $summary;
    }

    public static function getStatusLabel($status)
    {
        error_log("Get status HTML status: " .$status);
        switch ($status) {
            case BpostOrder::$STATUS_NOT_EXPORTED:
                return esc_html__('Not Exported', 'bpost-shipping-platform');

            case BpostOrder::$STATUS_EXPORTED_SUCCESSFULLY:
                return esc_html__('Exported', 'bpost-shipping-platform');

            case BpostOrder::$STATUS_EXPORT_ERRORS:
                return esc_html__('Error on Export', 'bpost-shipping-platform');
        }
    }
}
