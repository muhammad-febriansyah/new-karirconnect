<?php

/**
 * Guards the Android Chrome "Auto Dark Theme" opt-out. Without an explicit
 * color-scheme declaration, Chrome on Android lightens text inside portaled
 * popovers (select dropdowns) while keeping the white background, making the
 * options invisible. The root template must keep declaring a light scheme.
 */
it('ships the light color-scheme meta tag to opt out of forced dark mode', function (): void {
    $this->get('/')
        ->assertOk()
        ->assertSee('<meta name="color-scheme" content="light">', false);
});
