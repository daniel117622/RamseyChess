import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface Game
{
    id     : string;
    owner  : string;
    players: string[];
    result : string;
    date   : string;
}

interface PaginatedGames
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

    getGames(sub: string | undefined, itemsPerPage: number, pageNumber: number): Observable<PaginatedGames>
    {

        const url = `${this.baseUrl}?sub=${sub}&items_per_page=${itemsPerPage}&page_number=${pageNumber}`;
        return this.http.get<PaginatedGames>(url);
    }
}
