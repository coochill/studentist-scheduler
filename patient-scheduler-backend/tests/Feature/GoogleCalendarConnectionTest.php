<?php

namespace Tests\Feature;

use App\Models\GoogleCalendarConnection;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class GoogleCalendarConnectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_google_calendar_routes_require_authentication(): void
    {
        $this->getJson('/api/google-calendar/status')->assertUnauthorized();
        $this->postJson('/api/google-calendar/connect')->assertUnauthorized();
        $this->deleteJson('/api/google-calendar/disconnect')->assertUnauthorized();
    }

    public function test_user_can_view_their_disconnected_status(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/google-calendar/status')
            ->assertOk()
            ->assertExactJson([
                'connected' => false,
                'email' => null,
                'status' => null,
            ]);
    }

    public function test_connection_refresh_token_is_encrypted_and_owned_by_user(): void
    {
        $user = User::factory()->create();

        $connection = GoogleCalendarConnection::create([
            'user_id' => $user->id,
            'google_account_id' => 'google-account-1',
            'google_email' => 'user@example.com',
            'refresh_token' => 'refresh-token-value',
            'status' => 'connected',
        ]);

        $this->assertSame('refresh-token-value', $connection->fresh()->refresh_token);
        $this->assertNotSame(
            'refresh-token-value',
            DB::table('google_calendar_connections')->where('id', $connection->id)->value('refresh_token'),
        );

        $otherUser = User::factory()->create();

        $this->actingAs($otherUser, 'sanctum')
            ->getJson('/api/google-calendar/status')
            ->assertExactJson([
                'connected' => false,
                'email' => null,
                'status' => null,
            ]);
    }

    public function test_connect_returns_google_authorization_url_with_required_scope(): void
    {
        config([
            'services.google_calendar.client_id' => 'client-id',
            'services.google_calendar.client_secret' => 'client-secret',
            'services.google_calendar.redirect_uri' => 'https://example.test/oauth/google-calendar/callback',
        ]);

        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/google-calendar/connect')
            ->assertOk()
            ->assertJsonStructure(['authorization_url']);

        $this->assertStringContainsString(
            rawurlencode('https://www.googleapis.com/auth/calendar.events.owned'),
            $response->json('authorization_url'),
        );
    }

    public function test_callback_rejects_an_unknown_oauth_state(): void
    {
        $this->get('/oauth/google-calendar/callback?state=unknown-state')
            ->assertRedirectContains('google_calendar=invalid_state');
    }
}
