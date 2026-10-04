<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_resources_require_authentication(): void
    {
        $this->getJson('/api/patients')->assertUnauthorized();
    }

    public function test_user_can_login_and_logout(): void
    {
        $user = User::factory()->create([
            'email' => 'authorized@example.com',
            'password' => 'test-password',
        ]);

        $login = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'test-password',
        ])->assertOk()->assertJsonStructure(['token', 'user']);

        $token = $login->json('token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/logout')
            ->assertOk();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/patients')
            ->assertUnauthorized();
    }
}
