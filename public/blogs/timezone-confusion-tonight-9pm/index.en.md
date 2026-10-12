## The origin of the matter

An overseas customer sent a message: **“Can we discuss the production environment issue at 9 PM tonight?”**

After reading it, the specialist relayed it to me: “The customer said they need to handle production issues at 9 PM tonight.”

I thought to myself, 9 PM at night, after dinner I can still take a short break, then just open the computer to handle it. How pleasant.

Then, there is nothing after that.

## Time Zone Deadly Traps

Here’s how it works:

- The customer is in the US, referring to **9 PM US time**  
- 9 PM in the US = **9 AM China time** (Eastern Time ET, UTC-5)  
- The commissioner only said "9 PM tonight" without indicating the time zone  
- I naturally interpreted this as **9 PM China time**

Timeline:

```
American customer perspective:
  "Tonight at 9" → Eastern Time 21:00 → Beijing Time 09:00 the next day ✅

My understanding:
  "Tonight at 9" → Beijing Time 21:00 → Eastern Time 08:00 ❌

Actual gap: a full 12 hours!
```

## Disaster site

The next morning, the alarm went off at 9:45, and I woke up groggily to prepare for work at 10.

Looking at my phone — the message list exploded:

> Customer (3 hours ago): Hi, I'm ready, are you there?
>
> Customer (2 hours ago): Hello?
>
> Customer (1 hour ago): I guess we'll have to reschedule...

**The customer waited for me for over an hour and then went to sleep.**

And I only got up at 9:45.

Ahhhhhhhhh!!!

## Review: Where did the problem occur?

### 1. The time zone context of the information transmission was lost.

An overseas customer said "tonight 9pm", where "tonight" refers to their time, not mine. However, after being relayed by a specialist, it turned into "9pm tonight" in Chinese, and the time zone information was lost.

### 2. The default assumptions for cross-border collaboration are different

- By default, the customer assumes you know he is in the US, so they are referring to US time
- I assume "tonight" refers to tonight in China
- The specialist may not be aware of this time difference issue either

### 3. No need for a second confirmation

If they had asked "Please confirm whether it's Beijing time or US time?", this incident would not have occurred

## Common time zone comparisons (life-saving table)

When dealing with overseas customers, this table must be memorized:

| US Time Zone | Difference from Beijing Time | His statement of 9 PM = Our |
|-------------|---------------------------|---------------------------|
| Eastern Time ET (UTC-5) | -13 hours | Next morning 10:00 |
| Central Time CT (UTC-6) | -14 hours | Next morning 11:00 |
| Pacific Time PT (UTC-8) | -16 hours | The next afternoon 13:00 |
| During daylight saving time it’s 1 hour earlier | | |

> Note: During US daylight saving time (March–November), the difference is 1 hour less. For example, Eastern during daylight saving time EDT (UTC-4), 9 PM = Beijing time next morning 9:00.

So this time, during daylight saving time, 9 PM in the Eastern United States = 9 AM in Beijing, while I only start work at 10 AM...

## Tears and lessons learned

### Several things that must be done for cross-border communication:

**Always bring the time zone.** Whether you say it or the other party says it, the time must be followed by the time zone. "9 PM ET tonight" or "9 AM Beijing time tomorrow", adding more details can be life-saving.

**Use UTC as a reference point.** The team uses UTC time for communication internally, then converts it to local time. For example, `UTC 01:00` = Beijing 09:00 = East Coast US 20:00 (during daylight saving time).

**Transmit messages fully.** When a specialist or intermediary conveys time information, the original time zone must be included. “The customer said Eastern Time in the US is 9 PM tonight, which translates to 9 AM for us tomorrow.”

**Set calendar reminders.** After receiving time zone-specific meeting times, immediately create an event in the calendar to let the system automatically convert time zones for you. Google Calendar and Outlook support multi-time zone displays.

**Confirm key meetings in advance.** A few hours before the meeting, send a confirmation message: “Confirming our meeting at 9pm ET / 9am Beijing time tomorrow, correct?”

## Final words

Time zone issues may seem minor, but they can be a hidden threat in cross-border collaboration. Just the word "tonight" can vary by a full half day due to different time zones.

This experience has made me realize that: **In cross-border communication, times without indicating the time zone are like a time bomb.**

Friends who read this article are encouraged not to repeat my mistakes. Remember, what overseas customers call "tonight," is likely your "early morning."

> My current work habit is this: whenever it comes to overseas clients, my first reaction is to open the time zone converter. It’s better to double-check once more than to go through the despair of “the client is already asleep while I’m just getting up.”

Finished screaming, next time definitely. 🫠
