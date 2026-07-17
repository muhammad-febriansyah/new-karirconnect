<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\JobStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\CompanyIndexRequest;
use App\Http\Resources\Api\V1\CompanyDetailResource;
use App\Http\Resources\Api\V1\CompanyResource;
use App\Http\Resources\Api\V1\JobResource;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CompanyController extends Controller
{
    public function index(CompanyIndexRequest $request): AnonymousResourceCollection
    {
        $companies = Company::query()
            ->with(['industry:id,name', 'city:id,name', 'size:id,name'])
            ->withCount(['jobs as open_jobs_count' => fn ($query) => $query->where('status', JobStatus::Published)])

            // The public visibility gate: approved or verified, never suspended.
            ->recruiterActive()

            ->when($request->filled('search'), fn ($query) => $query->where('name', 'like', '%'.$request->string('search')->toString().'%'))
            ->when($request->filled('industry_id'), fn ($query) => $query->where('industry_id', $request->integer('industry_id')))
            ->when($request->filled('province_id'), fn ($query) => $query->where('province_id', $request->integer('province_id')))
            ->when($request->boolean('verified_only'), fn ($query) => $query->where('verification_status', 'verified'))
            ->orderByDesc('verification_status')
            ->orderBy('name')
            ->paginate($request->perPage())
            ->withQueryString();

        return CompanyResource::collection($companies);
    }

    public function show(Company $company): JsonResponse
    {
        // Pending or suspended employers are not browsable. 404 keeps their
        // existence private, matching the web detail page.
        abort_unless($company->hasRecruiterAccess(), 404);

        $company->load([
            'industry:id,name',
            'size:id,name',
            'province:id,name',
            'city:id,name',
            'offices',
            'badges' => fn ($query) => $query->where('is_active', true),
        ]);

        return response()->json([
            'data' => new CompanyDetailResource($company),
        ]);
    }

    /**
     * Jobs for one company.
     *
     * Split off from show() and paginated: the web page hard-caps this list at
     * 20, which silently hides the rest of a large employer's postings.
     */
    public function jobs(CompanyIndexRequest $request, Company $company): AnonymousResourceCollection
    {
        abort_unless($company->hasRecruiterAccess(), 404);

        $jobs = $company->jobs()
            ->with(['company:id,name,slug,logo_path,verification_status', 'city:id,name', 'category:id,name'])
            ->where('status', JobStatus::Published)
            ->orderByDesc('is_featured')
            ->orderByDesc('published_at')
            ->paginate($request->perPage())
            ->withQueryString();

        return JobResource::collection($jobs);
    }
}
