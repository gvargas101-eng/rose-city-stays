import { createLocalEventsDraft } from "../server/local-events-drafts";

const content = `## Plan a Late-Summer and Fall Stay in Tyler

Tyler’s late-summer calendar quickly turns into a full fall season of youth sports, art, museum events, and family-friendly festivals. If you are traveling for a tournament, planning a visit with family, or looking for a weekend in East Texas, this August–October guide highlights a few verified dates worth placing on your calendar. Event details can change, so always confirm times, tickets, and registration directly with the organizer before you travel.

## August: Fall Sports Start Taking Shape

Families with young athletes have several reasons to watch Tyler’s sports calendar in August. **Rose Capital East Little League** announced that Fall Ball registration opens **August 1** and that the season will be played at Faulkner Park. This is a useful planning note for baseball families who may need a convenient home base near Tyler’s parks and athletic fields.

The **Tyler Soccer Association** is also moving into its fall season. Its site says the Fall 2026 season begins in **September**, with team and coach communication occurring in late August or early September. Lindsey Park will host scheduled games, and the association notes that food trucks will be available during the season. Travelers visiting for soccer should check the association calendar for game times and field information before booking.

## September: Baseball Weekends, Art, and Local Culture

September brings several baseball tournament weekends to Tyler. **Five Tool East Texas** lists the UT Tyler Fall Opener for **September 12–13**, followed by UT Tyler events on **September 19–20** and **September 26–27**. Tournament families often appreciate a full home rather than a single hotel room—especially when they need space for gear, meals, and downtime between games.

For a cultural afternoon, the Goodman-LeGrand Museum’s **“It’s All in the Bag with a Hat on Top”** exhibit runs from **September 5 through October 3**. The exhibit features vintage hats, purses, and accessories, with museum hours listed Tuesday through Saturday from 10 a.m. to 4 p.m. A suggested donation applies.

On **Saturday, September 19**, the **5th Annual Tyler Arts Festival** is scheduled from **10 a.m. to 5 p.m.** at the Caldwell Arts Academy Soccer Field. The City of Tyler lists art, food, music, workshops, markets, and family activities among the festival’s offerings. It is an easy addition to a weekend itinerary for couples, families, and friends exploring downtown Tyler.

## October: Museum Nights, Rose Festival Season, and Family Fun

October is one of Tyler’s most recognizable event months. On **October 3**, the Goodman-LeGrand Museum is scheduled to host **A Night at the Museum: Secret Garden Soirée**, a formal masked costume party supporting preservation of the historic museum.

The **Rose Festival Arts & Crafts Fair** returns to Bergfeld Park on **October 17**. The City of Tyler describes the fair as featuring more than 70 booths with handcrafted items, giving visitors a simple way to browse local makers and enjoy a classic Rose City weekend.

Families visiting near the end of the month can look toward the **Fall Family Fun Festival** at Glass Recreation Center on **Thursday, October 29**, from **4 to 7 p.m.** The city lists it as a family festival—an especially practical option for guests traveling with children during the school-year season.

## A Comfortable Base for Your Tyler Weekend

Whether you are in town for a youth sports weekend, a local festival, or a fall getaway, Rose City Stays offers private homes across Tyler with room to rest, cook, and stay connected. Our properties include **1 Gig WiFi**, easy self check-in, and locations convenient to the city’s parks, hospital district, dining, and event venues.

Before finalizing travel plans, verify each event’s current time, location, ticketing, and weather policy with the organizer. Then choose the Tyler stay that gives your group a more comfortable way to experience East Texas.

## Sources and Event Details

- [Tyler Parks & Recreation Events Directory](https://www.tylerparksandrec.com/Events-directory)
- [Tyler Soccer Association](https://www.tylersoccer.com/)
- [Five Tool East Texas Baseball Events](https://fivetool.org/regions/east-texas)
- [Rose Capital East Little League](https://www.rosecapitaleast.com/)
- [Tyler Area Chamber of Commerce Events Calendar](https://business.tylertexas.com/events/calendar)
`;

const draft = await createLocalEventsDraft({
  title: "Tyler Events: August–October 2026 Guide",
  excerpt: "Plan a Tyler stay around fall youth sports, baseball tournaments, museum events, the Tyler Arts Festival, and Rose Festival season.",
  content,
  metaDescription: "Explore Tyler TX events from August through October 2026, including youth sports, fall festivals, arts, and family activities. Plan your stay today.",
  tags: ["Tyler events", "Tyler TX", "youth sports", "fall festivals", "East Texas travel"],
  periodLabel: "August–October 2026",
  sourceUrls: [
    "https://www.tylerparksandrec.com/Events-directory",
    "https://www.tylersoccer.com/",
    "https://fivetool.org/regions/east-texas",
    "https://www.rosecapitaleast.com/",
    "https://business.tylertexas.com/events/calendar",
  ],
});

console.log(JSON.stringify({ created: draft }));
