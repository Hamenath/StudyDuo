import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInviteJoinUrl,
  buildInviteShareText,
  buildSocialShareLinks,
  extractInviteCode,
} from './inviteShare';

test('extractInviteCode handles raw codes, invite URLs, and full WhatsApp share text', () => {
  assert.equal(extractInviteCode('duo-py6026'), 'DUO-PY6026');
  assert.equal(
    extractInviteCode('https://ais-pre-example.run.app/?invite=duo-a1b2c3'),
    'DUO-A1B2C3'
  );
  assert.equal(
    extractInviteCode(
      'Join Alex Chen on StudyDuo for "Python in 60 Days"! Click https://studyduo.app/?invite=DUO-99X8Y7 to join'
    ),
    'DUO-99X8Y7'
  );
  assert.equal(
    extractInviteCode('Hey partner, use code DUO-77ABCD on StudyDuo!'),
    'DUO-77ABCD'
  );
  assert.equal(extractInviteCode('   '), '');
});

test('buildInviteJoinUrl normalizes origin and encodes invite code', () => {
  const url = buildInviteJoinUrl('https://studyduo.app/', 'duo-py6026');
  assert.equal(url, 'https://studyduo.app/?invite=DUO-PY6026');
});

test('buildInviteShareText includes goal title, code, and join link', () => {
  const joinUrl = 'https://studyduo.app/?invite=DUO-PY6026';
  const res = buildInviteShareText({
    code: 'DUO-PY6026',
    goalTitle: 'Master Python in 60 Days',
    inviterName: 'Alex Chen',
    joinUrl,
  });
  assert.ok(res.subject.includes('Alex Chen'));
  assert.ok(res.shortText.includes('DUO-PY6026'));
  assert.ok(res.fullText.includes(joinUrl));
});

test('buildSocialShareLinks generates valid WhatsApp and all social share URLs', () => {
  const bundle = buildSocialShareLinks({
    code: 'DUO-PY6026',
    goalTitle: 'Master Python in 60 Days',
    inviterName: 'Alex Chen',
    origin: 'https://studyduo.app',
    inviteeEmail: 'maya@example.com',
  });

  assert.equal(bundle.code, 'DUO-PY6026');
  assert.equal(bundle.joinUrl, 'https://studyduo.app/?invite=DUO-PY6026');
  assert.ok(bundle.whatsappUrl.startsWith('https://wa.me/?text='));
  assert.ok(decodeURIComponent(bundle.whatsappUrl).includes('https://studyduo.app/?invite=DUO-PY6026'));
  assert.ok(bundle.telegramUrl.startsWith('https://t.me/share/url?'));
  assert.ok(bundle.twitterUrl.startsWith('https://twitter.com/intent/tweet?'));
  assert.ok(bundle.facebookUrl.startsWith('https://www.facebook.com/sharer/sharer.php?'));
  assert.ok(bundle.linkedinUrl.startsWith('https://www.linkedin.com/sharing/share-offsite/?'));
  assert.ok(bundle.redditUrl.startsWith('https://www.reddit.com/submit?'));
  assert.ok(bundle.emailUrl.startsWith('mailto:maya@example.com?subject='));
  assert.equal(bundle.platforms.length, 7);
});
