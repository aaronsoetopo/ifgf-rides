import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date());

export const users = sqliteTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  createdAt: createdAt(),
});

/** One row per user who has signed up to drive. The home address is never shown to other users. */
export const drivers = sqliteTable("drivers", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  campus: text("campus").notNull(),
  address: text("address").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  seats: integer("seats").notNull(),
  car: text("car"),
  maxPickupMiles: real("max_pickup_miles").notNull().default(15),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
});

export type RequestStatus = "open" | "matched" | "cancelled";

/** A passenger's request for a ride to one campus on one Sunday. */
export const rideRequests = sqliteTable(
  "ride_requests",
  {
    id: id(),
    passengerId: text("passenger_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    campus: text("campus").notNull(),
    serviceDate: text("service_date").notNull(), // YYYY-MM-DD (a Sunday, Pacific time)
    address: text("address").notNull(),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    partySize: integer("party_size").notNull().default(1),
    notes: text("notes"),
    status: text("status").$type<RequestStatus>().notNull().default("open"),
    driverId: text("driver_id").references(() => users.id, { onDelete: "set null" }),
    matchedAt: integer("matched_at", { mode: "timestamp" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("ride_requests_campus_date_idx").on(t.campus, t.serviceDate),
    index("ride_requests_driver_date_idx").on(t.driverId, t.serviceDate),
  ],
);

export type InviteStatus = "pending" | "accepted" | "declined" | "closed";

/** A request offered to one nearby driver. The first driver to accept gets the passenger. */
export const rideInvites = sqliteTable(
  "ride_invites",
  {
    id: id(),
    requestId: text("request_id")
      .notNull()
      .references(() => rideRequests.id, { onDelete: "cascade" }),
    driverId: text("driver_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    distanceMiles: real("distance_miles").notNull(),
    status: text("status").$type<InviteStatus>().notNull().default("pending"),
    respondedAt: integer("responded_at", { mode: "timestamp" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("ride_invites_request_driver_idx").on(t.requestId, t.driverId),
    index("ride_invites_driver_idx").on(t.driverId, t.status),
  ],
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    readAt: integer("read_at", { mode: "timestamp" }),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.readAt)],
);

export type User = typeof users.$inferSelect;
export type Driver = typeof drivers.$inferSelect;
export type RideRequest = typeof rideRequests.$inferSelect;
export type RideInvite = typeof rideInvites.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
