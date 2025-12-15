<?php

use Automattic\WooCommerce\Utilities\OrderUtil;

require_once(BPOST_PLUGIN_PATH.'/includes/class-woo-Bpost-order.php');
include_once(WP_PLUGIN_DIR.'/woocommerce/woocommerce.php');

/**
 * this class handles the ui actions for order management
 *
 *
 * @package Bpost.admin
 * @since   1.0.0
 */
class BpostOrderUI {

    public function __construct() {
        $this->add_filters();
        $this->add_actions();

    }

    /**
     * adds columns to the order view
     * adds buttons to export to Bpost
     * https://codex.wordpress.org/Plugin_API/Filter_Reference/manage_edit-post_type_columns
     * columns available since wp 3.1
     *
     * @return void
     */
    public function add_filters(){

        if (OrderUtil::custom_orders_table_usage_is_enabled()) {
            add_filter( 'manage_woocommerce_page_wc-orders_columns', array($this,'order_columns') );
            add_filter( 'posts_join', array($this, 'query_filter_order_status_join') );
            add_filter( 'posts_where', array($this, 'query_filter_order_status_where') );
            add_filter( 'bulk_actions-woocommerce_page_wc-orders', array( $this, 'register_bulk_export' ) );
            add_filter( 'handle_bulk_actions-woocommerce_page_wc-orders', array( $this, 'handle_bulk' ), 10, 3 );
        } else {
            add_filter( 'manage_edit-shop_order_columns', array($this,'order_columns') );
            add_filter( 'posts_join', array($this, 'query_filter_order_status_join') );
            add_filter( 'posts_where', array($this, 'query_filter_order_status_where') );
            add_filter( 'bulk_actions-edit-shop_order', array( $this, 'register_bulk_export' ) );
            add_filter( 'handle_bulk_actions-edit-shop_order', array( $this, 'handle_bulk' ), 10, 3 );
        }

    }

    /**
     * WP actions for the order ui
     * @return void
     */
    public function add_actions(){

        if (OrderUtil::custom_orders_table_usage_is_enabled()) {
            add_action( 'manage_woocommerce_page_wc-orders_custom_column', array($this,'order_column_values_hpos'),25,2);
            add_action( 'restrict_manage_posts' , array($this, 'action_filter_order_status') );
            add_action( 'admin_head', array( $this, 'custom_js_to_head') );
            add_action( 'admin_init', array($this, 'admin_init'));
            add_action( 'wp_ajax_Bpost_print_label', array($this, 'ajax_print_label') );
            add_action( 'wp_ajax_Bpost_label_status', array($this, 'ajax_monitor_label_status') );
        }else{
            add_action( 'manage_shop_order_posts_custom_column', array($this,'order_column_values'));
            add_action( 'restrict_manage_posts' , array($this, 'action_filter_order_status') );
            add_action( 'admin_head', array( $this, 'custom_js_to_head') );
            add_action( 'admin_init', array($this, 'admin_init'));
            add_action( 'wp_ajax_Bpost_print_label', array($this, 'ajax_print_label') );
            add_action( 'wp_ajax_Bpost_label_status', array($this, 'ajax_monitor_label_status') );
        }

        add_action( 'woocommerce_before_order_object_save', array($this,'action_woocommerce_before_order_object_save'), 10, 2);

    }

    public function action_woocommerce_before_order_object_save($order, $data_store)
    {

        $posted_info = $_POST;


        $newData = [
            'first_name' => $posted_info['_shipping_first_name'],
            'last_name' => $posted_info['_shipping_last_name'],
            'company' => $posted_info['_shipping_company'],
            'address_1' => $posted_info['_shipping_address_1'],
            'address_2' => $posted_info['_shipping_address_2'],
            'city' => $posted_info['_shipping_city'],
            'postcode' => $posted_info['_shipping_postcode'],
            'state' => $posted_info['_shipping_state'],
            'country' => $posted_info['_shipping_country'],
            'phone' => $posted_info['_shipping_phone']
        ];

        $oldOrderData = [
            'first_name' => $order->get_shipping_first_name(),
            'last_name' => $order->get_shipping_last_name(),
            'company' => $order->get_shipping_company(),
            'address_1' => $order->get_shipping_address_1(),
            'address_2' => $order->get_shipping_address_2(),
            'city' => $order->get_shipping_city(),
            'postcode' => $order->get_shipping_postcode(),
            'state' => $order->get_shipping_state(),
            'country' => $order->get_shipping_country(),
            'phone' => $order->get_shipping_phone()
        ];

        if ( $newData != $oldOrderData) {


            $BpostOrder = new BpostWooOrder($order->get_id());
            $ordermeta = $BpostOrder->get_order_meta();


            if ( isset($ordermeta->status) && $ordermeta->status == BpostOrder::$STATUS_EXPORTED_SUCCESSFULLY && $order->get_status() != 'arrival-shipment') {

                $summary = BpostWooOrder::export([$order->get_id()],0,false,$newData);
                wp_redirect(BpostWooOrder::get_redirect_from_summary($summary));
            }
        }

    }

    /**
     *
     */
    public function ajax_print_label() {
        global $current_user;

        $orderid = isset($_POST['orderid']) ? sanitize_text_field(wp_unslash($_POST['orderid'])) : '';

        if(!isset($_POST['nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'])), 'label_print_nonce') || !in_array('administrator', $current_user->roles)){
            wp_send_json_error(['noValidCustomer' => 'The request is not sent from the admin panel or by an user with the correct role']);die();
        }

        if (!$orderid) {
            wp_send_json_error(json_encode(array('Error' => 'No order id, cannot print label')));
        }

        $labelResponse = json_encode(BpostWooOrder::print_label(array($orderid)));
        wp_send_json_success($labelResponse);
    }

    public function ajax_monitor_label_status() {
        global $Bpost,$current_user;
        $callbackurl = isset($_POST['callbackUrl']) ? sanitize_text_field(wp_unslash($_POST['callbackUrl'])) : '';

        $pattern = 'labels\/[a-f0-9]+/';

        if (!isset($_POST['nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'])), 'label_print_nonce') || !in_array('administrator', $current_user->roles)){
            die(json_encode( ['noValidCustomer' => 'The request is not sent from the admin panel or by an user with the correct role']));
        };

        error_log("requesting label status from $callbackurl");
        $response = BpostWoo::get_api()->monitor_label_status($callbackurl);
        error_log("label_response " . var_export($response, true));
        if (isset($response->response->Finished) && $response->response->Finished == 100) {
            if (isset($response->response->ClientReferenceCodeList)) {
                foreach($response->response->ClientReferenceCodeList as $labelresult) {
                    $order = new BpostWooOrder($labelresult->ShopItemId);

                    $status = BpostOrder::$LABEL_STATUS_NOT_REQUESTED;
                    $msg =  '';
                    $labelurl = '';

                    if ($labelresult->Error->Id == 0 ) {
                        $status = BpostOrder::$LABEL_STATUS_PRINTED;
                        $labelurl = $response->response->LabelFile; // all labels in this batch share the same url
                        $msg = $Bpost->translate('labelprinted');
                        //$order->set_tracking_id($labelresult->TrackingId, $labelurl);
                    }
                    else {
                        $status = BpostOrder::$LABEL_STATUS_ERROR;
                        $msg = $labelresult->Error->Info;
                    }

                    $order_meta = $order->get_order_meta();
                    $msg = $order_meta->message . $msg;
                    $labelresult->message = $msg;
                    $order->set_label_meta($labelresult->ShopItemId,$status,$labelurl,$msg);
                }
            }
        }

        die(json_encode($response));
    }


    /**
     * if Bpost_action is set to export-all then export all not already set as successfully exported
     *
     * @return mixed an object describing the success of the export
     */
    public function admin_init() {
        global $current_user;

        $Bpost_action = isset($_GET['Bpost_action']) ? sanitize_text_field(wp_unslash($_GET['Bpost_action'])) : '';


        switch ($Bpost_action) {
            case  'export-all' :
                return BpostWooOrder::export_all();
            case 'export-this':
                $summary =  BpostWooOrder::export(array($_GET['post']));
                wp_redirect(BpostWooOrder::get_redirect_from_summary($summary));
                die();
            default:
                break;
        }
    }



    /**
     * Adds filters to select specific order status
     *
     */
    public function action_filter_order_status() {
        global $Bpost;

        $type = isset( $_GET['post_type'] ) ? $_GET['post_type'] : 'post' ;
        $status = isset( $_GET['Bpost_status'] ) ? $_GET['Bpost_status'] : '';
        if( $type == 'shop_order' ) {
            ?>
            <span class='shitpimize-status-filter'>
        <select name='Bpost_status'>
          <option value=''><?php echo esc_html($Bpost->translate('All')); ?></option>
          <?php foreach(BpostWooOrder::$status_text as $id => $status_text) { ?>
              <option value="<?php echo esc_attr($id); ?>" <?php selected($status, $id); ?>><?php echo esc_html($status_text); ?></option>
          <?php } ?>
        </select>
      </span>
            <?php
        }
    }

    public function notice_area () {
        echo "<div id=\"Bpost_notices\"></div>";
    }

    /**
     * filter the orders by status
     *
     * @return string - the join to include Bpost meta
     */
    // public function query_filter_order_status_join( $join ) {
    //     global $pagenow, $wpdb;

    //     $type = isset( $_GET['page'] )?  $_GET['page'] : 'wc_orders';
    //     $status = isset( $_GET['Bpost_status'] ) ? $_GET['Bpost_status'] : '';
    //     if( $type == 'shop_order' && $status ){
    //         $join .= " LEFT JOIN {$wpdb->prefix}Bpost on {$wpdb->prefix}Bpost.id = {$wpdb->prefix}posts.ID ";
    //     }

    //     return $join;
    // }

    public function query_filter_order_status_join( $join ) {
        global $pagenow, $wpdb;

        // Sanitize and validate the input parameters
        $type = isset( $_GET['page'] ) ? sanitize_text_field( $_GET['page'] ) : 'wc_orders';
        $status = isset( $_GET['Bpost_status'] ) ? sanitize_text_field( $_GET['Bpost_status'] ) : '';

        // Check if the type and status are valid before constructing the SQL query
        if ( 'shop_order' === $type && ! empty( $status ) ) {
            $join .= $wpdb->prepare(
                " LEFT JOIN {$wpdb->prefix}Bpost ON {$wpdb->prefix}Bpost.id = {$wpdb->prefix}posts.ID "
            );
        }

        return $join;
    }

    /**
     * filter the posts if status is set
     */
    public function query_filter_order_status_where( $where ) {
        global $wpdb;


        $type = isset( $_GET['page'] ) ? sanitize_text_field( $_GET['page'] ) : 'wc_orders';
        $status = isset( $_GET['Bpost_status'] ) ? sanitize_text_field( $_GET['Bpost_status'] ) : '';

        if( $type == 'wc_orders' && $status ){
            $where .= $status != 1 ? ' AND ' .$wpdb->prefix.'Bpost.status='.$status : ' AND ' .$wpdb->prefix.'Bpost.status is null' ;
        }

        return $where;
    }

    /**
     * add the column headers
     */
    public function order_columns( $columns ) {
        global $Bpost;
        ;

        $new_columns = array();
        foreach($columns as $key => $column) {
            $new_columns[$key] = $columns[$key];
            if($key === 'order_date') {
                $new_columns['Bpost_status'] = BPOST_BRAND . ' ' . $Bpost->translate('Bpostcolumntitle');
            }
        }
        return $new_columns;

    }

    /**
     * add the column values
     * https://codex.wordpress.org/Plugin_API/Action_Reference/manage_$post_type_posts_custom_column
     *
     * @param string column
     * @param int post_id
     */
    public function order_column_values_hpos($column_name, $order) {


        switch ($column_name) {
            case 'Bpost_status':
                $order_meta = BpostWooOrder::get_shipping_meta( $order->get_id() );
                echo $this->get_status_icon($order_meta ? $order_meta : (object)array('id' => $order->get_id(), 'message' => '', 'status' => ''));
                break;
        }
    }

    public function order_column_values( $column ) {
        global $post;

        switch ($column) {
            case 'Bpost_status':
                $order_meta = BpostWooOrder::get_shipping_meta( $post->ID );
                echo wp_kses_post($this->get_status_icon($order_meta ? $order_meta : (object)array('id' => $post->ID, 'message' => '', 'status' => '')));
                break;
        }
    }

    /**
     * returns a representation of this status
     * @param mixed $order_meta- order metadata
     *
     * @returnstring containing the html representation of this order's status
     */
    public function get_status_icon($order_meta){
        global $Bpost;

        $class = '';
        $msgclass = '';

        $message = $Bpost->translate('Not Exported');

        if( $order_meta ) {
            // Determine the message: use the order message if available, otherwise use status text
            if (!empty($order_meta->message)) {
                $message = $order_meta->message;
            } elseif (isset(BpostOrder::$status_text[$order_meta->status])) {
                $message = $Bpost->translate(BpostOrder::$status_text[$order_meta->status]);
            }

            if( strlen($message > 100) ){
                $msgclass .= ' Bpost-message-large';
            }

            switch ($order_meta->status) {
                case BpostOrder::$STATUS_EXPORTED_SUCCESSFULLY:
                    $class = ' Bpost-icon-success';
                    break;
                case BpostOrder::$STATUS_EXPORT_ERRORS:
                    $class = ' Bpost-icon-error';
                    break;
                case BpostOrder::$STATUS_TEST_SUCCESSFUL:
                    $class = ' Bpost-icon-test-successful';
                    break;
                case BpostOrder::$LABEL_STATUS_PRINTED:
                    $class = ' Bpost-icon-print-printed';
                    break;
                case BpostOrder::$LABEL_STATUS_ERROR:
                    $class = ' Bpost-icon-print-error';
                    break;
                case BpostOrder::$LABEL_STATUS_NOT_REQUESTED:
                    $class = ' Bpost-icon-print-notprinted';
                    break;
                default: //Not exported or no status
                    $class .= ' Bpost-icon-not-exported';
                    $message .= $message ? '' : $Bpost->translate('Not Exported');
            }
        } else {
            $class .= ' Bpost-icon-not-exported';
        }

        if( isset($order_meta->pickup_label ) &&  $order_meta->pickup_label ){
            $message .= '<br/>' . esc_html($Bpost->translate('Pickup Point')) . ' -  ' . esc_html($order_meta->pickup_label);
        }

        // Also append the option to create a label
        if (!Bpost_is_marketplace()) {
            $labelagree = get_option('Bpost_labelagree');
            $btnlabellabel = $labelagree ? $Bpost->translate('printlabel') : $Bpost->translate('labellocked');
            $labelclick = $labelagree ? "Bpost.printlabel(event," . esc_js($order_meta->id) . ");" : 'event.stopPropagation()';
            $labelbtn = "<span class=\"Bpost-status Bpost-tooltip-wrapper\">
          <span class=\"Bpost-tooltip-reference\">
            <span class=\"button Bpost-icon Bpost-btn-label-print\"  title=\"label\" onclick='" . esc_js($labelclick) . "'></span>
          </span>
          <span class=\"Bpost-tooltip-message\">
            <span class=\"Bpost-tooltip-message__arrow\"></span>
            <span class=\"Bpost-tooltip__inner\">" . esc_html($btnlabellabel) . "</span>
          </span>
        </span>";
        } else {
            $labelbtn = '';
        }

        // Ensure message is never null
        if (is_null($message) || $message === '') {
            $message = $Bpost->translate('Not Exported');
            if (empty($message)) {
                $message = 'Not Exported'; // Fallback if translation fails
            }
        }

        // Split the string at the pipe symbol and escape each part
        $splitString = explode('|', $message);
        // Join the parts with a <br> tag and escape each part
        $result = implode('<br>', array_map('esc_html', $splitString));

        return '<span class="Bpost-status Bpost-tooltip-wrapper">
          <span class="Bpost-tooltip-reference ' . esc_attr($msgclass) . '">
            <span id="Bpost-label' . esc_attr($order_meta->id) . '" class="Bpost-icon ' . esc_attr($class) . '"></span>
          </span>
          <span class="Bpost-tooltip-message">
            <span class="Bpost-tooltip-message__arrow"></span>
            <span class="Bpost-tooltip__inner" id="Bpost-tooltip' . esc_attr($order_meta->id) . '">' . $result . '</span>
          </span>
        </span>' . $labelbtn;
    }


    /**
     * Adds an action to the bulk action menu
     *
     * @param array $bulk_actions - associative array of bulk actions
     * @return void
     */
    public function register_bulk_export($bulk_actions) {
        global $Bpost;


        //$bulk_actions['Bpost_export'] = $Bpost->translate( 'Export to' ) . ' ' . BPOST_BRAND;
        $bulk_actions['Bpost_printlabel'] =  BPOST_BRAND .': ' . $Bpost->translate('printlabel');
        return $bulk_actions;
    }

    public function handle_bulk ($redirect_to, $doaction, $post_ids) {

        if( $doaction == 'Bpost_export' ){
            return $this->bulk_export( $post_ids );
        }
        else if( $doaction == 'Bpost_printlabel') {
            return $this->bulk_print_label ( $post_ids );
        }

        return $redirect_to;
    }

    /**
     * Printing Labels is an assynchronous process
     * At this time it's only possible to print 1 label at a time
     */
    public function bulk_print_label($post_ids) {
        global $Bpost;

        $summary = BpostWooOrder::print_label($post_ids);

        # Too Many labels
        if ( isset( $summary->response->ErrorList ) && count( $summary->response->ErrorList ) > 0 && $summary->response->ErrorList[0]->Id ==  6 ) {
            $paged = isset($_GET['paged']) ? absint($_GET['paged']) : 1;
            return esc_url_raw(admin_url("edit.php?post_type=shop_order&paged={$paged}&Error=" . urlencode($Bpost->translate('multiorderlabelwarn'))));
        }

        # Other high level errors
        if ( isset($summary->response->ErrorList) && count($summary->response->ErrorList) > 0 && $summary->response->ErrorList[0]->Id > 0 ) {
            $paged = isset($_GET['paged']) ? absint($_GET['paged']) : 1;
            return esc_url_raw(admin_url("edit.php?post_type=shop_order&paged={$paged}&Error=" . urlencode($summary->ErrorList[0]->Info)));
        }

        if ( $summary->httpCode == 500 ){
            $paged = isset($_GET['paged']) ? absint($_GET['paged']) : 1;
            return esc_url_raw(admin_url("edit.php?post_type=shop_order&paged={$paged}&Error=" . urlencode('Fatal API error. Contact support with the order ids you just tried to print')));
        }

        $urlString = '';

        BpostWoo::log ( "bulk_export summary " . var_export($summary, true) );
        if (isset($summary->orderresponse) && !isset($summary->response)) {
            $summary->response = $summary->orderresponse;
        }

        if (isset($summary->response)) {
            if(isset($summary->response->CallbackURL)) {
                $urlString .= '&CallbackURL=' . $summary->response->CallbackURL;
            }
            else if (isset($summary->Error) && $summary->Error->Id > 0) {
                $urlString .='&Error=' . $summary->Error->Info;
            }
            elseif (isset($summary->ErrorList))  {
                $errors = '';
                foreach($summary->ErrorList as  $error) {
                    BpostWoo::log ( "bulk_export summary ");
                    $errors .= $error->Info . ' ';
                }
                $urlString .= '&Error=' . $errors;
            }
        }

        $paged = isset($_GET['paged']) ? absint($_GET['paged']) : 1;
        return admin_url("edit.php?post_type=shop_order&paged=" . $paged . $urlString);
    }

    /**
     * Do the bulk export
     */
    public function bulk_export( $post_ids ) {
        $summary = BpostWooOrder::export($post_ids);
        $urlString = '';


        BpostWoo::log( "bulk_export summary " . var_export($summary, true) );


        foreach((array)$summary as $key => $value) {
            if(!is_array($value)){
                $urlString .= '&Bpost_' . $key . '=' . $value;
            }
        }

        $paged = isset($_GET['paged']) ? absint($_GET['paged']) : 1;
        return admin_url("edit.php?post_type=shop_order&paged=" . $paged . $urlString);
    }


    public function custom_js_to_head() {
        global $Bpost;

        if(isset($_GET['Bpost_nOrders'])){
            $summary = (object)array(
                'n_success'  => isset($_GET['Bpost_n_success']) ? sanitize_text_field(wp_unslash($_GET['Bpost_n_success'])) : '',
                'n_errors'   => isset($_GET['Bpost_n_errors']) ? sanitize_text_field(wp_unslash($_GET['Bpost_n_errors'])) : '',
                'login_url'  => isset($_GET['Bpost_login_url']) ? esc_url_raw(wp_unslash($_GET['Bpost_login_url'])) : '',
                'nOrders'    => isset($_GET['Bpost_nOrders']) ? sanitize_text_field(wp_unslash($_GET['Bpost_nOrders'])) : '',
                'nInvalid'   => isset($_GET['Bpost_nInvalid']) ? sanitize_text_field(wp_unslash($_GET['Bpost_nInvalid'])) : '',
                'message'    => isset($_GET['Bpost_message']) ? sanitize_text_field(wp_unslash($_GET['Bpost_message'])) : '',
            );
            $export_message = BpostWooOrder::get_export_summary($summary);
        }

        $class = 'page-title-action Bpost-export-btn ' . BPOST_BRAND;
        $is_single_order = isset($_GET['id']);
        $export_url = $is_single_order ? 
            admin_url('edit.php?post_type=shop_order&Bpost_action=export-this&post=' . esc_attr(sanitize_key($_GET['id']))) : 
            admin_url('edit.php?post_type=shop_order&Bpost_action=export-all');

        wp_enqueue_script('bpost-custom-script', '/wp-content/plugins/bpost-shipping-platform/assets/js/bpost-export-message.js', array('jquery'), null, true);

        // Localize script to pass PHP variables to JavaScript
        wp_localize_script('bpost-custom-script', 'BpostData', array(
            'Bpost_label_request'    => esc_html($Bpost->translate('requestinglabel')),
            'Bpost_label_click'      => esc_html($Bpost->translate('labelclick')),
            'Bpost_label_label'      => esc_html($Bpost->translate('printlabel')),
            'export_url'             => esc_url($export_url),
            'class'                  => esc_attr($class),
            'export_link_text'       => '',
            'is_single_order'        => $is_single_order ? true : false,
            'post_id'                => isset($_GET['id']) ? esc_attr(sanitize_key($_GET['id'])) : '',
            'export_message'         => isset($export_message) ? wp_kses_post($export_message) : '',
            'login_url'              => isset($summary) ? esc_url($summary->login_url) : '',
        ));
    }

}

new BpostOrderUI();
