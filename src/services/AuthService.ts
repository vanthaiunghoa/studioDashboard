import {
    Injectable,
    Inject,
    forwardRef
} from "@angular/core";
import {
    Router,
    ActivatedRouteSnapshot,
    RouterStateSnapshot, ActivatedRoute
} from "@angular/router";
import {AppStore} from "angular2-redux-util";
import {LocalStorage} from "./LocalStorage";
import {StoreService} from "./StoreService";
import {
    AppdbAction,
    AuthState
} from "../appdb/AppdbAction";
import 'rxjs/add/observable/fromPromise';
import {Observable} from 'rxjs/Observable';
import {Map} from 'immutable';
import {Lib} from "../Lib";
import {Ngmslib} from "ng-mslib";
import * as _ from 'lodash';


export enum FlagsAuth {
    AuthPass,
    AuthFailEnterprise,
    WrongPass,
    NotEnterprise,
    Enterprise,
    WrongTwoFactor
}

@Injectable()
export class AuthService {
    private ubsub: () => void;
    private m_authState: AuthState;
    private m_pendingNotify: any;
    private m_twoFactorToken: string = '';

    constructor(private router: Router,
                @Inject(forwardRef(() => AppStore)) private appStore: AppStore,
                @Inject(forwardRef(() => AppdbAction)) private appdbAction: AppdbAction,
                @Inject(forwardRef(() => LocalStorage)) private localStorage: LocalStorage,
                private activatedRoute: ActivatedRoute) {
        this.listenStore();
    }

    // @Inject(forwardRef(() => StoreService)) private storeService: StoreService,

    public start() {
        var i_user, i_pass, i_remember;

        // check local store first
        var credentials = this.localStorage.getItem('remember_me');
        if (credentials && (credentials && credentials.u != '')) {
            i_user = credentials.u;
            i_pass = credentials.p;
            i_remember = credentials.r;

        } else {
            // check url params
            var id = this.activatedRoute.snapshot.queryParams['id'];
            if (!_.isUndefined(id)) {
                id = `${id}=`;
                try {
                    credentials = Ngmslib.Base64().decode(id);
                    var local = this.activatedRoute.snapshot.queryParams['local'];
                    var credentialsArr = credentials.match(/user=(.*),pass=(.*)/);
                    i_user = credentialsArr[1]
                    i_pass = credentialsArr[2]
                    i_remember = 'false';
                } catch (e) {
                }
            }
        }
        if (i_user && i_pass) {
            this.appdbAction.createDispatcher(this.appdbAction.authenticateUser)(i_user.trim(), i_pass.trim(), i_remember);
        } else {
            // no valid user/pass found so go to user login, end of process
            this.router.navigate(['/UserLogin']);
        }
    }


    private listenStore() {

        this.appStore.sub((credentials: Map<string,any>) => {
        }, 'appdb.twoFactorStatus');


        this.appStore.sub((credentials: Map<string,any>) => {
            this.m_authState = credentials.get('authenticated');
            console.log(this.m_authState);
            var user = credentials.get('user');
            var pass = credentials.get('pass');
            var remember = credentials.get('remember');
            switch (this.m_authState) {
                case AuthState.FAIL: {
                    this.localStorage.removeItem('remember_me');
                    break;
                }
                case AuthState.PASS: {
                    this.saveCredentials(user, pass, remember);
                    break;
                }
                case AuthState.TWO_FACTOR: {
                    this.saveCredentials(user, pass, remember);
                    console.log('waiting need two factor');
                    break;
                }
            }
            if (this.m_pendingNotify)
                this.m_pendingNotify(this.m_authState)
        }, 'appdb.credentials');
    }

    public  saveCredentials(i_user, i_pass, i_remember) {
        if (i_remember) {
            this.localStorage.setItem('remember_me', {
                u: i_user,
                p: i_pass,
                r: i_remember
            });
        } else {
            this.localStorage.setItem('remember_me', {
                u: '',
                p: '',
                r: i_remember
            });
        }
    }

    private onAuthFail() {
        setTimeout(() => {
            Lib.BootboxHide();
            this.saveCredentials('', '', '');
        }, 1000);
        return false;
    }


    public authUser(i_user: string, i_pass: string, i_remember: string): void {

        this.appdbAction.createDispatcher(this.appdbAction.authenticateUser)(i_user.trim(), i_pass.trim(), i_remember);

        // this.m_twoFactorToken = i_twoFactorToken;
        // if (i_twoFactorToken) {
        //     this.appStore.dispatch(this.appdbAction.authenticateTwoFactor(i_twoFactorToken, false));
        // } else {
        //
        // }

        // bootbox.dialog({
        //     closeButton: false,
        //     title: "Please wait, Authenticating...",
        //     message: " "
        // });
        // no credentials were entered manually so first try and pull from local storage
    }


    public authServerTwoFactor(i_twoFactorToken): void {
        this.appStore.dispatch(this.appdbAction.authenticateTwoFactor(i_twoFactorToken, false));
        // this.m_twoFactorToken = i_twoFactorToken;
        // if (i_twoFactorToken) {
        //     this.appStore.dispatch(this.appdbAction.authenticateTwoFactor(i_twoFactorToken, false));
        // } else {
        //
        // }

        // bootbox.dialog({
        //     closeButton: false,
        //     title: "Please wait, Authenticating...",
        //     message: " "
        // });
        // no credentials were entered manually so first try and pull from local storage
    }

    public getLocalstoreCred(): {u: string, p: string, r: string} {
        var credentials = this.localStorage.getItem('remember_me');
        if (!credentials)
            return {
                u: '',
                p: '',
                r: ''
            };
        return {
            u: credentials.u,
            p: credentials.p,
            r: credentials.r,
        }
    }

    public checkAccess(): Promise<any> {
        let target = ['/Login'];

        switch (this.m_authState) {
            case AuthState.FAIL: {
                break;
            }
            case AuthState.PASS: {
                return Promise.resolve(true);
            }
            case AuthState.TWO_FACTOR: {
                return Promise.resolve(true);
            }
        }
        if (this.getLocalstoreCred().u == '') {
            this.router.navigate(target);
            return Promise.resolve(false);
        }
        return new Promise((resolve) => {
            var credentials = this.localStorage.getItem('remember_me');
            var user = credentials.u;
            var pass = credentials.p;
            var remember = credentials.r;

            this.appdbAction.createDispatcher(this.appdbAction.authenticateUser)(user, pass, remember);

            this.m_pendingNotify = (i_authState: AuthState) => {

                switch (i_authState) {
                    case AuthState.FAIL: {
                        resolve(false);
                        break;
                    }
                    case AuthState.PASS: {
                        this.router.navigate(target);
                        resolve(true);
                        break;
                    }
                    case AuthState.TWO_FACTOR: {
                        console.log('waiting on 2 factor...');
                        resolve(false);
                        break;
                    }
                }
            }
        });
    }


    public canActivate(activatedRouteSnapshot: ActivatedRouteSnapshot, routerStateSnapshot: RouterStateSnapshot): Observable<boolean> {
        return Observable
            .fromPromise(this.checkAccess())
            .do(result => {
                if (!result)
                    this.router.navigate(['/Login']);
            });
    }

    private ngOnDestroy() {
        this.ubsub();
    }
}

export const AUTH_PROVIDERS: Array<any> = [{
    provide: AuthService,
    useClass: AuthService
}];
