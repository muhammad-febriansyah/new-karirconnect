<?php

namespace App\Http\Controllers;

use App\Enums\DevicePlatform;
use App\Services\Notifications\DeviceTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DeviceTokenController extends Controller
{
    public function __construct(private readonly DeviceTokenService $tokens) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:512'],
            'platform' => ['nullable', Rule::in(['web', 'android', 'ios'])],
            'device_name' => ['nullable', 'string', 'max:160'],
            'app_version' => ['nullable', 'string', 'max:32'],
        ]);

        $platform = DevicePlatform::from($data['platform'] ?? 'web');
        $deviceName = $data['device_name'] ?? substr((string) $request->userAgent(), 0, 160);

        $this->tokens->register(
            $request->user(),
            $platform,
            $data['token'],
            $deviceName,
            $data['app_version'] ?? null,
        );

        return response()->json(['ok' => true]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:512'],
        ]);

        $this->tokens->revoke($data['token']);

        return response()->json(['ok' => true]);
    }
}
