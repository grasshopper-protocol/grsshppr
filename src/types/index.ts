export type Notification = {
  id: string;
  type: string;
  message: string;
  resourceId: string | null;
  priority: string;
  read: boolean;
  createdAt: string;
};

export type Mentor = {
  mentorId: string;
  name: string;
  image: string | null;
  slug: string | null;
};

export type Session = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
};
