import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDuoInviteLink,
  buildDuoShareMessage,
  buildSocialShareTargets,
  extractInviteCodeFromInput,
} from './socialShare';

test('buildDuoInviteLink generates normalized invite URL with ?invite= parameter', () => {
  const link = buildDuoInviteLink('duo-ab12cd', 'https://studyduo.example.com/');
  assert.equal(link, 'https://studyduo.example.com/?invite=DUO-AB12CD');
});

test('buildDuoShareMessage includes inviter name, goal title, and normalized invite code', () => {
  const msg = buildDuoShareMessage({
    inviteCode: 'duo-py60',
    goalTitle: 'Become a Python Developer in 60 Days',
    inviterName: 'Alex Chen',
    groupName: 'Python Builders Duo',
  });
  assert.ok(msg.includes('Alex Chen'));
  assert.ok(msg.includes('Become a Python Developer in 60 Days'));
  assert.ok(msg.includes('Python Builders Duo'));
  assert.ok(msg.includes('DUO-PY60'));
});

test('buildSocialShareTargets includes WhatsApp, X (Twitter), Telegram, and other platforms with encoded link', () => {
  const targets = buildSocialShareTargets({
    inviteCode: 'DUO-99AA11',
    goalTitle: 'Master Data Structures',
    inviterName: 'Alex',
    origin: 'https://studyduo.app',
  });

  const ids = targets.map((t) => t.id);
  assert.ok(ids.includes('whatsapp'));
  assert.ok(ids.includes('x'));
  assert.ok(ids.includes('telegram'));
  assert.ok(ids.includes('linkedin'));
  assert.ok(ids.includes('reddit'));
  assert.ok(ids.includes('facebook'));
  assert.ok(ids.includes('email'));

  const whatsapp = targets.find((t) => t.id === 'whatsapp');
  const x = targets.find((t) => t.id === 'x');
  const telegram = targets.find((t) => t.id === 'telegram');

  assert.ok(whatsapp?.href.startsWith('https://wa.me/?text='));
  assert.ok(decodeURIComponent(whatsapp?.href || '').includes('https://studyduo.app/?invite=DUO-99AA11'));

  assert.ok(x?.href.startsWith('https://twitter.com/intent/tweet?'));
  assert.ok(decodeURIComponent(x?.href || '').includes('https://studyduo.app/?invite=DUO-99AA11'));

  assert.ok(telegram?.href.startsWith('https://t.me/share/url?'));
  assert.ok(decodeURIComponent(telegram?.href || '').includes('https://studyduo.app/?invite=DUO-99AA11'));
});

test('extractInviteCodeFromInput parses raw code, full invite URL, or pasted WhatsApp message', () => {
  assert.equal(extractInviteCodeFromInput('duo-a1b2c3'), 'DUO-A1B2C3');
  assert.equal(
    extractInviteCodeFromInput('https://studyduo.app/?invite=duo-778899'),
    'DUO-778899'
  );
  assert.equal(
    extractInviteCodeFromInput(
      'Alex invited you to StudyDuo! Use invite code DUO-K9M4P2 or open https://studyduo.app/?invite=DUO-K9M4P2'
    ),
    'DUO-K9M4P2'
  );
});
