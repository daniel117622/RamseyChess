import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Game
{
    _id                 : { $oid: string };
    game_date           : string;
    owner               : string;
    pgn                 : string;
    strategy_id_black   : string;
    strategy_id_white   : string;
    strategy_white_owner: string;
    strategy_black_owner: string;
}

export interface PaginatedGames
{
    games         : Game[];
    total_pages   : number;
    items_per_page: number;
    current_page  : number;
}

@Injectable({
    providedIn: 'root',
})
export class GameService
{
    private baseUrl = '/api/get_games_by_owner_paged';

    constructor(private http: HttpClient) {}

    getGames (sub: string | undefined, itemsPerPage: number, pageNumber: number): Observable<PaginatedGames> 
    {
        const body = 
        {
            sub: sub,
            items_per_page: itemsPerPage,
            page_number: pageNumber
        };
        
        return this.http.post<PaginatedGames>(this.baseUrl, body);
    }

    getGameById(gameId: string, sub: string | undefined): Observable<Game>
    {
        const url = `/api/get_game_by_id?sub=${sub}&game_id=${gameId}`;
        return this.http.get<Game>(url);
    }
}


