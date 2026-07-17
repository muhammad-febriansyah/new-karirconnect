<?php

use App\Services\Settings\SettingService;
use Database\Seeders\SettingSeeder;

beforeEach(function (): void {
    $this->seed([SettingSeeder::class]);
});

it('renders no analytics at all when no measurement id is configured', function (): void {
    // Analytics is opt-in: with nothing configured the page must not talk to
    // Google, so an unconfigured deployment ships no third-party tracking.
    $html = $this->get('/')->getContent();

    expect($html)->not->toContain('googletagmanager.com')
        ->and($html)->not->toContain('gtag(');
});

it('renders the gtag snippet once a measurement id is set', function (): void {
    app(SettingService::class)->set('seo', 'google_analytics_id', 'G-TESTID1234');

    $html = $this->get('/')->getContent();

    expect($html)->toContain('googletagmanager.com/gtag/js?id=G-TESTID1234')
        ->and($html)->toContain("gtag('js'");
});

it('disables gtag automatic page views', function (): void {
    // The app sends page views itself on every Inertia navigation. If gtag also
    // sent its own, the first page of each session would be counted twice and
    // no later navigation counted at all -- every visitor would look like a
    // one-page bounce.
    app(SettingService::class)->set('seo', 'google_analytics_id', 'G-TESTID1234');

    expect($this->get('/')->getContent())->toContain('send_page_view');
});

it('renders gtm only when a container id is set', function (): void {
    expect($this->get('/')->getContent())->not->toContain('gtm.js');

    app(SettingService::class)->set('seo', 'google_tag_manager_id', 'GTM-TEST123');

    expect($this->get('/')->getContent())->toContain('gtm.js');
});

it('escapes the measurement id into the page', function (): void {
    // The id comes from an admin-editable setting and lands inside a <script>.
    // It is emitted through @json, so a quote cannot break out of the string.
    app(SettingService::class)->set('seo', 'google_analytics_id', "G-X');alert(1);//");

    $html = $this->get('/')->getContent();

    expect($html)->not->toContain("gtag('config', 'G-X');alert(1);//')");
});
