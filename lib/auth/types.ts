/**
 * The signed-in person, as the rest of the app sees them.
 *
 * The id is the NoCodeBackend user id. It is what every table's `userId`
 * column holds, and NCB sets and checks that column itself.
 */
export type AppUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  fullName: string;
  avatarUrl: string | null;
};

export type AuthSession = {
  user: AppUser;
  /** Which household profile this session belongs to. */
  profileSlug: string;
};
