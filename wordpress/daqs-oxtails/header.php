<?php
/**
 * Document head and opening body.
 *
 * @package Daqs_Oxtails
 */

?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#0b1424">
<meta name="description" content="Fall-off-the-bone oxtails, Cajun boils and frozen daiquiris made from scratch in Plano, Texas. Call the kitchen to order pickup or delivery.">
<link rel="icon" type="image/svg+xml" href="<?php echo esc_url( DAQS_ASSETS . 'favicon.svg' ); ?>">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Daqs &amp; Oxtails">
<meta property="og:title" content="Daqs &amp; Oxtails — Soul Food &amp; Frozen Daiquiris">
<meta property="og:description" content="Slow-braised oxtails, Cajun boils and daiquiris blended to order. Plano, Texas.">
<meta property="og:image" content="<?php echo esc_url( DAQS_ASSETS . 'img/hero.jpg' ); ?>">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Daqs &amp; Oxtails — Soul Food &amp; Frozen Daiquiris">
<meta name="twitter:description" content="Slow-braised oxtails, Cajun boils and daiquiris blended to order in Plano, Texas.">
<meta name="twitter:image" content="<?php echo esc_url( DAQS_ASSETS . 'img/hero.jpg' ); ?>">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "name": "Daqs & Oxtails",
  "description": "Authentic soul food, Cajun boils and frozen daiquiris in Plano, Texas.",
  "servesCuisine": ["Soul Food", "Cajun", "Creole"],
  "priceRange": "$$",
  "telephone": "+1-972-292-9771",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "8700 Preston Road, Suite 127",
    "addressLocality": "Plano",
    "addressRegion": "TX",
    "postalCode": "75024",
    "addressCountry": "US"
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Tuesday", "Wednesday", "Thursday"],
      "opens": "12:00",
      "closes": "21:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Friday", "Saturday"],
      "opens": "12:00",
      "closes": "22:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "Sunday",
      "opens": "12:00",
      "closes": "20:00"
    }
  ]
}
</script>
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
