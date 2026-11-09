<?php
/**
 * Daqs & Oxtails theme.
 *
 * The site is a prebuilt React application (the ordering-free build). This file
 * loads that build from /assets and teaches WordPress the client-side routes so
 * they answer 200 instead of 404.
 *
 * @package Daqs_Oxtails
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'DAQS_VERSION', '1.0.0' );
define( 'DAQS_ASSETS', get_template_directory_uri() . '/assets/' );
define( 'DAQS_ASSETS_DIR', get_template_directory() . '/assets/' );

/**
 * Enqueue the built app.
 *
 * Vite hashes filenames, so find the current bundle rather than hard-coding a
 * name: a new build then needs no PHP change.
 */
function daqs_enqueue_app() {
	$scripts = glob( DAQS_ASSETS_DIR . 'index-*.js' );
	$styles  = glob( DAQS_ASSETS_DIR . 'index-*.css' );

	wp_enqueue_style(
		'daqs-fonts',
		'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&display=swap',
		array(),
		null
	);

	if ( $styles ) {
		wp_enqueue_style( 'daqs-app', DAQS_ASSETS . basename( $styles[0] ), array(), DAQS_VERSION );
	}

	if ( $scripts ) {
		wp_enqueue_script( 'daqs-app', DAQS_ASSETS . basename( $scripts[0] ), array(), DAQS_VERSION, true );
	}
}
add_action( 'wp_enqueue_scripts', 'daqs_enqueue_app' );

/** Vite emits an ES module; WordPress prints a classic tag unless told. */
function daqs_script_as_module( $tag, $handle, $src ) {
	if ( 'daqs-app' !== $handle ) {
		return $tag;
	}

	return '<script type="module" crossorigin src="' . esc_url( $src ) . '"></script>';
}
add_filter( 'script_loader_tag', 'daqs_script_as_module', 10, 3 );

/** Warm up the font hosts the stylesheet pulls from. */
function daqs_resource_hints( $hints, $relation ) {
	if ( 'preconnect' !== $relation ) {
		return $hints;
	}

	$hints[] = 'https://fonts.googleapis.com';
	$hints[] = array(
		'href'        => 'https://fonts.gstatic.com',
		'crossorigin' => 'anonymous',
	);

	return $hints;
}
add_filter( 'wp_resource_hints', 'daqs_resource_hints', 10, 2 );

/** Theme features the shell relies on. */
function daqs_setup() {
	add_theme_support( 'title-tag' );
	add_theme_support( 'html5', array( 'script', 'style' ) );
}
add_action( 'after_setup_theme', 'daqs_setup' );

/**
 * The app routes on the client, but WordPress still has to answer those URLs
 * with the shell instead of its own 404.
 */
function daqs_client_routes() {
	$simple = array( 'menu', 'catering', 'about', 'visit', 'checkout', 'kitchen' );

	foreach ( $simple as $route ) {
		add_rewrite_rule( '^' . $route . '/?$', 'index.php?daqs_route=' . $route, 'top' );
	}

	add_rewrite_rule( '^checkout/success/?$', 'index.php?daqs_route=checkout-success', 'top' );
	add_rewrite_rule( '^order/[^/]+/?$', 'index.php?daqs_route=order', 'top' );
	add_rewrite_rule( '^kitchen/ticket/[^/]+/?$', 'index.php?daqs_route=kitchen-ticket', 'top' );
}
add_action( 'init', 'daqs_client_routes' );

/** Carry the matched route through the query. */
function daqs_query_vars( $vars ) {
	$vars[] = 'daqs_route';

	return $vars;
}
add_filter( 'query_vars', 'daqs_query_vars' );

/** A client route is a real page, not a 404. */
function daqs_route_status() {
	if ( get_query_var( 'daqs_route' ) ) {
		status_header( 200 );
	}
}
add_action( 'template_redirect', 'daqs_route_status' );

/** Do not let WordPress "correct" these URLs into a guessed canonical. */
function daqs_no_canonical_guess( $redirect ) {
	return get_query_var( 'daqs_route' ) ? false : $redirect;
}
add_filter( 'redirect_canonical', 'daqs_no_canonical_guess' );

/** Rewrite rules only take effect once they are flushed. */
function daqs_flush_routes() {
	daqs_client_routes();
	flush_rewrite_rules();
}
add_action( 'after_switch_theme', 'daqs_flush_routes' );
