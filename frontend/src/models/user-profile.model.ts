export interface UserProfile 
{
    _id: {$oid: string;};
    elo       : number;
    last_login: string | null;
    nickname  : string | null;
    strategies: string[];
    sub       : string;
    username  : string | null;
}