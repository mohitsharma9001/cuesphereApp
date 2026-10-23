import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { DemoVideo } from '@/components/for-clubs/demo-video';
import { Icon } from '@/components/icon';
import { Body, Button, Caption, Card, Headline, PressableScale, RemoteImage, Row, Screen, SectionTitle, Title } from '@/components/ui';
import { radius, useTheme } from '@/constants/theme';
import { CLUBS_PHONE_DISPLAY, CLUBS_WHATSAPP, WEBSITE_URL } from '@/lib/config';

const WHATSAPP_URL = `https://wa.me/${CLUBS_WHATSAPP}?text=${encodeURIComponent("Hi! I run a snooker club and I'd like to know more about CueSphere.")}`;

const PAINS = [
  'Start and end times written on paper or a Google Sheet, one sheet per table',
  '“I’ll pay later” — and the club forgets who owes what',
  'No idea how much the club made this week until someone adds it up',
];

const FEATURES: { title: string; text: string; icon: [string, string] }[] = [
  { title: 'Table timers & billing', text: 'Start a table in one tap; the bill is worked out to the minute.', icon: ['clock.fill', 'timer'] },
  { title: 'Loser pays or split', text: 'Loser pays, split or custom shares. Cash, UPI or card.', icon: ['scalemass.fill', 'balance'] },
  { title: 'Dues & reminders', text: 'Every due by player. Remind or WhatsApp in one tap.', icon: ['bell.fill', 'notifications'] },
  { title: 'Income reports', text: 'Today, week, month or any dates — by payment method.', icon: ['chart.bar.fill', 'bar_chart'] },
  { title: 'Bookings & live status', text: 'Players see free tables and request a booking.', icon: ['calendar.badge.clock', 'event_available'] },
  { title: 'Tournaments', text: 'Registrations, entry fees, the draw and tables.', icon: ['trophy.fill', 'emoji_events'] },
  { title: 'Referee scoring', text: 'Every ball from a phone — fouls and free balls too.', icon: ['iphone', 'smartphone'] },
  { title: 'TV scoreboards', text: 'A TV per table, or one that rotates. Pair with a code.', icon: ['tv.fill', 'tv'] },
  { title: 'YouTube overlay', text: 'A pro score bar on your live stream. Add one link.', icon: ['play.rectangle.fill', 'smart_display'] },
  { title: 'Sponsor ads', text: 'Your sponsors play between frames on TVs and streams.', icon: ['megaphone.fill', 'campaign'] },
  { title: 'Players & friends', text: 'Profiles, follows, alerts and friendly matches.', icon: ['person.2.fill', 'group'] },
  { title: 'State & city rankings', text: 'Your tournaments feed the state rankings.', icon: ['medal.fill', 'military_tech'] },
];

const STEPS = [
  ['Create your club', 'Name, city and state. Takes two minutes.'],
  ['Add your tables', 'Table numbers and your hourly rate, e.g. ₹300/hr.'],
  ['Start your first table', 'Your staff use their phones. No new hardware needed.'],
];

const INCLUDED = [
  'Unlimited tables, timers and billing',
  'Dues, reminders and income reports',
  'Tournaments, referee scoring and live scores',
  'TV scoreboards and YouTube overlay',
  'Sponsor ads between frames',
  'Bookings and live table status for players',
];

const FAQ = [
  ['Do players pay anything?', 'No. Players and fans always use CueSphere free.'],
  ['What do I need?', 'Any smartphone for the front desk and referees. For scoreboards, any smart TV or TV stick with a web browser.'],
  ['Is it an app?', 'Yes — this one. Clubs can also run everything from the website, which installs like an app.'],
  ['Who sees the dues?', "You see every player's dues at your club. Each player sees only their own."],
  ['What happens after the launch period?', "We'll announce Club Pro pricing in advance, and every club gets a 30-day free trial before paying anything."],
];

/** For Clubs (#5): the pitch for club owners. */
export default function ForClubsScreen() {
  const { c } = useTheme();
  const openWhatsApp = () => Linking.openURL(WHATSAPP_URL);

  return (
    <Screen>
      {/* Hero: the real table photo under a cloth-green fade. */}
      <View style={{ borderRadius: radius.lg, overflow: 'hidden' }}>
        <RemoteImage uri={`${WEBSITE_URL}/media/hero-table-tall.jpg`} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} />
        <LinearGradient colors={['rgba(6,95,70,0.55)', 'rgba(6,78,59,0.92)']} style={{ padding: 22, paddingTop: 70, gap: 10 }}>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '800', letterSpacing: 1.4 }}>CUESPHERE FOR CLUBS</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: '900', letterSpacing: -0.6, lineHeight: 36 }}>
            Run your club.{'\n'}
            <Text style={{ color: '#6EE7B7' }}>Stream every frame.</Text>
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, lineHeight: 21 }}>
            Table timers, billing, dues, tournaments, TV scoreboards and YouTube — the complete operating system for snooker clubs.
          </Text>
          <View style={{ gap: 10, marginTop: 6 }}>
            <PressableScale
              accessibilityRole="button"
              onPress={() => router.push('/club-enquiry')}
              style={{ backgroundColor: '#D4AF37', borderRadius: radius.pill, height: 50, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#0B0E12', fontWeight: '800', fontSize: 16 }}>Start your club — free</Text>
            </PressableScale>
            <PressableScale
              accessibilityRole="link"
              onPress={openWhatsApp}
              style={{ backgroundColor: '#25D366', borderRadius: radius.pill, height: 50, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
              <Icon ios="message.fill" android="chat" color="#FFFFFF" size={18} />
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>Chat on WhatsApp</Text>
            </PressableScale>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center' }}>Free while we launch · No card needed · 2-minute setup</Text>
        </LinearGradient>
      </View>

      <DemoVideo />

      <SectionTitle>Still running your club on a sheet?</SectionTitle>
      <Card>
        {PAINS.map((p) => (
          <Row key={p} style={{ alignItems: 'flex-start' }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
              <Text style={{ color: c.accent, fontWeight: '900', fontSize: 12 }}>✕</Text>
            </View>
            <Body style={{ flex: 1 }}>{p}</Body>
          </Row>
        ))}
      </Card>

      <SectionTitle>Everything your club needs</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {FEATURES.map((f, i) => (
          <View key={f.title} style={{ width: '48.4%' }}>
            <Card style={{ padding: 14, gap: 6, flex: 1 }}>
              <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon ios={f.icon[0]} android={f.icon[1]} color={c.primary} size={18} />
              </View>
              <Headline style={{ fontSize: 15 }}>{f.title}</Headline>
              <Caption>{f.text}</Caption>
            </Card>
          </View>
        ))}
      </View>

      <SectionTitle>Up and running today</SectionTitle>
      <Card style={{ gap: 14 }}>
        {STEPS.map(([title, text], i) => (
          <Row key={title} style={{ alignItems: 'flex-start' }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: c.onPrimary, fontWeight: '900' }}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Headline>{title}</Headline>
              <Caption>{text}</Caption>
            </View>
          </Row>
        ))}
      </Card>

      <SectionTitle>Pricing</SectionTitle>
      <Card style={{ borderWidth: 2, borderColor: c.primary, gap: 10 }}>
        <View style={{ alignSelf: 'flex-start', backgroundColor: c.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
          <Caption style={{ color: c.accent, fontWeight: '800' }}>LAUNCH OFFER</Caption>
        </View>
        <Row style={{ alignItems: 'baseline' }}>
          <Title>Club Pro</Title>
          <Title style={{ color: c.primary }}>Free</Title>
        </Row>
        <Caption>while we launch — every feature, every table</Caption>
        {INCLUDED.map((f) => (
          <Row key={f}>
            <Icon ios="checkmark.circle.fill" android="check_circle" color={c.primary} size={18} />
            <Body style={{ flex: 1 }}>{f}</Body>
          </Row>
        ))}
        <Caption>
          When paid plans start we&apos;ll tell you well in advance, with a 30-day free trial first. Players and fans never pay.
        </Caption>
      </Card>

      <SectionTitle>Questions</SectionTitle>
      <View style={{ gap: 8 }}>
        {FAQ.map(([q, a]) => (
          <FaqItem key={q} question={q} answer={a} />
        ))}
      </View>

      <View style={{ gap: 10, marginTop: 12 }}>
        <Button title="Start your club — free" icon={['plus.circle.fill', 'add_circle']} onPress={() => router.push('/club-enquiry')} />
        <Button title={CLUBS_PHONE_DISPLAY} variant="secondary" icon={['message.fill', 'chat']} onPress={openWhatsApp} />
      </View>
    </Screen>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Card onPress={() => setOpen((o) => !o)}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Headline style={{ flex: 1, fontSize: 15 }}>{question}</Headline>
          <Icon ios={open ? 'minus' : 'plus'} android={open ? 'remove' : 'add'} color={c.primary} size={16} />
        </Row>
        {open && (
          <View>
            <Body muted>{answer}</Body>
          </View>
        )}
      </Card>
    </View>
  );
}
